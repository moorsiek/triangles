var UI = (function(){
    var instance = null;

    function UI(canv) {
        if (instance) return instance;

        instance = this;
        this.canv = canv;
        this.triangleDownload = null;
        setupMenu.call(this);

        $("a, div").click(function(e){
            e.preventDefault();
        });
    }

    UI.prototype.enableCreate = function(){
        this.menu.newTriangle.closest('li').removeClass('disabled');
    };
    UI.prototype.disableCreate = function(){
        this.menu.newTriangle.closest('li').addClass('disabled');
    };
    UI.prototype.setCursor = function(cursor) {
        this.canv.$area.css('cursor', cursor);
    };
    UI.prototype.setTriangleDownload = function(downloader){
        this.triangleDownload = downloader;
    };  
    function setupMenu() {
        var ui = this;

        var menu = this.menu = {
            newTriangle: $("#newTriangle"),
            scale: {
                link: $("#scale"),
                value: {
                    sx: $("#inputScaleSX"),
                    sy: $("#inputScaleSY")
                }
            },      
            rotate: {
                link: $("#rotate"),
                value: $("#inputRotate")
            },  
            translate: {
                link: $("#translate"),
                value: {
                    x: $("#inputTranslateX"),
                    y: $("#inputTranslateY")
                }   
            },  
            setColor: {
                link: $("#setColor"),
                value: {
                    stroke: $("#selectColorStroke"),
                    fill: $("#selectColorFill")
                }   
            },
            writeFile: $("#writeFile"),
            readFile: $("#readFile"),
            remove: $("#remove")
        };

        menu.newTriangle.click(function(e){
            ui.canv.newTriangle();
        });

        menu.scale.link.click(function(e){
            var sx = Number(menu.scale.value.sx.val()),
                sy = Number(menu.scale.value.sy.val());
            ui.canv.scaleSelected(sx, sy);
        });

        menu.rotate.link.click(function(e){
            var angle = Number(menu.rotate.value.val());
            //rotate ожидает угол в радианах, так что переводим
            angle = angle / 180 * Math.PI;
            ui.canv.rotateSelected(angle);
        });

        menu.translate.link.click(function(e){
            var dx = Number(menu.translate.value.x.val()),
                dy = Number(menu.translate.value.y.val());
            ui.canv.translateSelected(dx, dy);
        });

        menu.setColor.link.click(function(e){
            ui.canv.setColorSelected(menu.setColor.value.stroke.val(), menu.setColor.value.fill.val());
        });

        menu.remove.click(function(e){
            ui.canv.removeSelected();
        });

        menu.writeFile.click(function(e){
            if (!ui.triangleDownload) return;

            var fileName = ui.triangleDownload.write(ui.canv.serializeTriangles()),
                $link = $('<a href="' + fileName + '">save log</a>')
                    .css({
                        visibility: 'hidden',
                        position: 'absolute'
                    })
                    .prop("download", fileName)
                    .prependTo($('body'));
            $link[0].click();
            $link.remove();
        });

        menu.readFile.click(function(e){
            if (!ui.triangleDownload) return;

            var $input = $('<input type="file"/>')
                .css({
                    visibility: 'hidden',
                    position: 'absolute'
                })
                .prependTo($('body'))
                .change(function(){
                    var reader = new FileReader();
                    reader.onload = function(e){
                        ui.canv.unSerializeTriangles(e.target.result);
                        $input.remove();
                    };
                    reader.readAsBinaryString(this.files[0]);
                });
            $input[0].click();
        });

    };

    return UI;
})();