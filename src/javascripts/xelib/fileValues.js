import { xelib } from './lib';
import { withHandles } from './helpers';

// HELPER VARIABLES
let fileHeaderFlagsPath = 'File Header\\Record Header\\Record Flags',
    nextObjectIdPath = 'File Header\\HEDR\\Next Object ID';

// FILE VALUE METHODS
Object.assign(xelib, {
    GetFileHeader: function(_id) {
        return xelib.GetElement(_id, 'File Header');
    },
    GetNextObjectID: function(_id) {
        return xelib.GetUIntValue(_id, nextObjectIdPath);
    },
    SetNextObjectID: function(_id, nextObjectID) {
        this.SetUIntValue(_id, nextObjectIdPath, nextObjectID);
    },
    GetFileName: function(_id) {
        return xelib.Name(_id);
    },
    GetAuthor: function(_id) {
        return xelib.GetValue(_id, 'File Header\\CNAM');
    },
    SetAuthor: function(_id, author) {
        return xelib.SetValue(_id, 'File Header\\CNAM', author);
    },
    GetDescription: function(_id) {
        return xelib.GetValue(_id, 'File Header\\SNAM');
    },
    SetDescription: function(_id, description) {
        if (!xelib.HasElement(_id, 'File Header\\SNAM'))
            xelib.AddElement(_id, 'File Header\\SNAM');
        return xelib.SetValue(_id, 'File Header\\SNAM', description);
    },
    GetIsESM: function(_id) {
        return xelib.GetFlag(_id, fileHeaderFlagsPath, 'ESM');
    },
    SetIsESM: function(_id, enabled) {
        return xelib.SetFlag(_id, fileHeaderFlagsPath, 'ESM', enabled);
    },
    GetLoadedFileNames: function() {
        let fileNames = undefined;
        withHandles(xelib.GetElements(), function(files) {
            fileNames = files.map((file) => { return xelib.Name(file) });
        });
        return fileNames;
    }
});
