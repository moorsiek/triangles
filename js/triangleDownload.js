//
var TriangleDownload = (function(){
    //
    function TriangleDownload(canv, filename){
        this.filename = filename || "triangle.json";
        this.fs = require('fs');
    }
    //
    TriangleDownload.prototype.write = function(data){
        this.fs.writeFileSync(this.filename, data);
        return this.filename;
    }

    return TriangleDownload;
})();