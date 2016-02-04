$(document).ready(function(){

    var canv = new Canvas($("#canv"));
    var cons = new Console(canv);
    var ui = new UI(canv);
    canv.setUI(ui);

    //если в браузере, не добавляем загрузку/сохранение
    if (typeof global !== "undefined") {
        var downloader = new TriangleDownload(canv);
        ui.setTriangleDownload(downloader);
    }

});