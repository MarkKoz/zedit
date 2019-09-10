ngapp.run(function(mergeAssetService, assetHelpers, pexService, progressLogger, gameService) {
    let {getOldPath, getNewPath, findGameAssets} = assetHelpers,
        {forEachPlugin} = mergeAssetService;

    const fragmentGroups = ['QUST', 'INFO', 'SCEN', 'PERK', 'PACK'],
        fragmentsPath = 'VMAD\\Script Fragments';

    let fragmentExpr = /.*scripts[\/\\].*_([a-f0-9]{8}).pex/i;

    let getPluginHandle = function(merge, filename) {
        let plugin = merge.plugins.findByKey('filename', filename);
        return plugin ? plugin.handle : 0;
    };

    let getFragmentsFromPlugin = function(pluginFile, group, fragments = []) {
        let records = xelib.GetRecords(pluginFile, group, true);
        xelib.WithEachHandle(records, record => {
            let handle = xelib.GetElement(record, fragmentsPath);
            if (handle) fragments.push({
                handle: record,
                record: xelib.LongName(record),
                filename: xelib.GetValue(handle, 'fileName') + '.pex'
            });
        });
        return fragments;
    };

    let getFragmentsFromDisk = function(plugin, folder) {
        if (folder === gameService.dataPath) return [];
        let folderLen = folder.length;
        return findGameAssets(plugin, folder, 'Scripts', '*.pex')
            .filter(filePath => fragmentExpr.test(filePath))
            .map(filePath => ({
                filename: fh.getFileName(filePath),
                filePath: filePath.slice(folderLen)
            }));
    };

    let findScriptFragments = function(merge, plugin, folder) {
        let pluginFile = getPluginHandle(merge, plugin),
            fragmentFiles = getFragmentsFromDisk(plugin, folder);
        if (!pluginFile) return fragmentFiles;
        return fragmentGroups.reduce((fragments, group) => {
            return getFragmentsFromPlugin(pluginFile, group, fragments);
        }, []).filter(fragment => {
            let fragmentFile = fragmentFiles.find(f => {
                return f.filename.equals(fragment.filename, true);
            });
            if (!fragmentFile) return;
            fragment.filePath = fragmentFile.filePath;
            return true;
        });
    };

    let buildFragmentAssetObj = (entry, a) => ({
        plugin: entry.plugin,
        folder: entry.folder,
        filePath: a.filePath
    });

    let getMergeRecord = function(merge, entry, rec) {
        let fidMap = merge.fidMap[entry.plugin],
            oldFid = xelib.GetHexFormID(rec, false, true),
            newFid = fidMap[oldFid] || oldFid,
            targetPlugin = merge.method === 'Clobber' ?
                entry.plugin : merge.plugin,
            ordinal = getLoadOrder(targetPlugin),
            formId = ordinal * 0x1000000 + parseInt(newFid, 16);
        return xelib.GetRecord(merge.plugin, formId, false);
    };

    let fixFragment = function(merge, entry, a) {
        let asset = buildFragmentAssetObj(entry, a),
            oldPath = getOldPath(asset, merge),
            newPath = getNewPath(asset, merge, fragmentExpr, true),
            fileName = fh.getFileBase(newPath),
            script = pexService.loadScript(oldPath);
        script.stringTable[0] = fileName;
        fh.jetpack.dir(fh.getDirectory(newPath));
        pexService.saveScript(script, newPath);
        let mergeRecord = getMergeRecord(merge, entry, a.handle),
            fragments = xelib.GetElement(mergeRecord, fragmentsPath);
        xelib.SetValue(fragments, 'fileName', fileName);
        xelib.GetElements(fragments, 'Fragments').forEach(fragment => {
            xelib.SetValue(fragment, 'scriptName', filename);
        });
    };

    mergeAssetService.addHandler({
        label: 'Script Fragments',
        priority: 1,
        get: function(merge) {
            forEachPlugin(merge, (plugin, folder) => {
                let assets = findScriptFragments(merge, plugin, folder);
                if (assets.length === 0) return;
                merge.scriptFragments.push({ plugin, folder, assets });
            });
        },
        handle: function(merge) {
            if (!merge.handleScriptFragments ||
                !merge.scriptFragments.length) return;
            progressLogger.log('Handling Script Fragments');
            pexService.setLogger(progressLogger);
            merge.scriptFragments.forEach(entry => {
                entry.assets.forEach(asset => {
                    fixFragment(merge, entry, asset);
                });
            });
        },
        cleanup: function(merge) {
            merge.scriptFragments.forEach(entry => {
                entry.assets.forEach(asset => {
                    if (asset.handle) xelib.Release(asset.handle);
                });
            });
        }
    });
});
