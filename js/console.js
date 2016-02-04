var Console = (function(){
    function Console(canv){
        this.command = "";
        this.canv = canv;
        this.echoBuffer = [];

        setupConsoleUi.call(this);
    }

    function ConsoleError(msg) {
        this.name = "ConsoleError";
        this.message = msg;
    }

    //Добавляет сообщение в вывод с классом `className` (по умолчанию класс "result").
    //HTML экранируется
    function log(msg, className) {
        var self = this,
            $li = $('<li/>'),
            escapeDic = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;',
                '&': '&amp;'
            }; 

        $li
            .addClass(className || 'result') //'echo', error
            .text(msg.replace(/[<>"'&]/g, function(match){ //замена
                return escapeDic[match] || match;
            }));
        this.$output.prepend($li);

        logFlushEchos.call(this);
    }

    //Извлекает буферизованные сообщения типа "echo" из буффера и выводит их
    function logFlushEchos() {
        var self = this;
        if (self.echoBuffer.length) {
            var echos = self.echoBuffer;
            self.echoBuffer = [];
            echos.forEach(function(echo){
                logEcho.call(self, echo, false);
            });
        }
    }

    //Выводит сообщение об ошибке (класс "error")
    function logError(msg) {
        log.call(this, msg, 'error');
    }

    //Выводит сообщение, дублирующе введенную команду (класс "echo")
    //Если `buf` == false, то вывод происходит сразу, иначе сообщение кладется в буффер
    function logEcho(msg, buf) {
        if (buf == null) buf = true;
        if (buf) {
            this.echoBuffer.push(msg);
        } else {
            log.call(this, msg, 'echo');
        }
    }

    //Выполняет предварительную настройку интерфейсной части консоли
    function setupConsoleUi() {
        var self = this;

        self.$console = $('#console');
        self.$input = self.$console.children('.input');
        self.$input //включаем "редактируемость" и запрещаем браузеру вмешиваться в текст
            .prop('contentEditable', true)
            .prop('spellcheck', false)
            .prop('autocapitalize', 'off')
            .prop('autocorrect', 'off');

        self.$output = self.$console.children('.output');

        self.$input
            //чтобы div получал фокус при клике по нему
            .click(function(e){
                self.$input.focus();
            })
            .keypress(function(e){
                if (e.keyCode == 13) {
                    e.preventDefault();

                    var cmd = self.$input.text();

                    logEcho.call(self, cmd);
                    try { //пытаемся выполнить команду
                        self.eval(cmd);
                    } catch (e) { //сообщаем об ошибке
                        logError.call(self, (e instanceof ConsoleError ? "Ошибка: " : "Непредвиденная ошибка: ") + (e.message || "неизвестная ошибка"));
                    }
                    logFlushEchos.call(self); //выводим все буферизованные echo

                    self.$input.html('');

                }
            })
            .on('paste', function(e){ //вставка
                var $this = $(this);
                $this.on('input', function(){
                    $this.html( $this.text() );
                    $this.off('input');
                    setTimeout(function(){
                        $this[0].blur();
                        $this[0].focus();
                    }, 0);
                });
            });
    }

    //Проверяет, является ли заданное значение числом
    function isAN(value) {
        return Object.prototype.toString.call(value).slice(8, -1) === "Number" && !isNaN(value);
    }

    //Интерпретация команд и выполнить команду и бросает исключение в случае неудачи
    Console.prototype.eval = function(str) {
        str = str.replace(/^\s*|\s*$/g,'');
        var lexicon = [
                {com: "help", maxLenArg: 0},
                {com: "create", maxLenArg: 6},
                {com: "translate", maxLenArg: 2},
                {com: "rotate", maxLenArg: 1},
                {com: "scale", maxLenArg: 2},
                {com: "select", maxLenArg: Infinity, packArgs: true},
                {com: "remove", maxLenArg: Infinity, method: "removeTriangles"},
                {com: "clear", maxLenArg: 0},
                {com: "list", maxLenArg: 0},
                {com: "color", maxLenArg: 2, type: 'hex'}
            ],
            command = null,
            args = [];

        var arrTmp = str.split(" "), arrTmpLen = arrTmp.length;

        for (var i=0; i<lexicon.length; i++){
            if ( (arrTmp[0] === lexicon[i].com) && ( arrTmpLen -1 <= lexicon[i].maxLenArg ) ) {
                for (var k=1; k<arrTmp.length; k++){
                    if (lexicon[i].type === 'hex') {
                        if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(arrTmp[k])) {
                            throw new ConsoleError("Неверно задан цвет! Формат: #hhh или #hhhhhh, где h - шестнадцатеричная цифра");
                        }
                        args.push(arrTmp[k]);
                    } else {
                        if ( !isAN( parseFloat(arrTmp[k]) ) ) {
                            throw new ConsoleError("В аргументах задано не число!");
                        }
                        args.push(parseFloat( arrTmp[k]) );
                    }
                    
                }
                command = lexicon[i].method || lexicon[i].com; //имя команды и метода могут отличаться
                if (lexicon[i].packArgs) { //если метод требует упаковать аргументы в массив
                    args = [args];
                }
                break;
            }
        }
        if (!command) throw new ConsoleError("Неизвестная команда или неверные аргументы!");

        this[command].apply(this, args);
    };

    //Выводит справочную информацию по использованию консоли
    Console.prototype.help = function(){
        var msg = "" +
                  "\nlist - Вывод списка id всех имеющихся треугольников\n" +
                  "\nclear - Очистка вывода консоли\n" +
                  "\ncreate ax ay bx by cx xy - Создание треугольника с вершинами в указанных координатах\n" +
                  "\nselect id1 id2 ... - Выделение треугольников с указанными идентификаторами\n"+
                  "\nselect - Выделение всех треугольников\n"+
                  "\nremove - Удаление выделенных треугольники\n"+
                  "\ntranslate dx dy - Перенос выделенных треугольников на указанные dx и dy (dy можно опустить)\n"+
                  "\nrotate deg - Поворот выделенных треугольников на deg градусов\n"+
                  "\nscale sx sy - Масштабирование выделенных треугольников в sx раз по x, в sy раз по y\n"+
                  "\nscale sxy - Масштабирование выделенных треугольников в sxy раз по x и y\n"+                      
                  "\nscale sxy - Масштабирование выделенных треугольников в sxy раз по x и y\n"+
                  "\ncolor fill contour - Задание цвета выделенных треугольников - заливки fill, контура contour\nЦвет задается шестнадцатеричной строкой #hhh или #hhhhhh, где h - 16-ричная цифра\n";
        log.call(this, msg);
    };

    /*create 3 3 120 120 3 120*/
    /*create 120 120 220 220 120 220*/

    //Создает треугольник с вершинами в заданных координатах
    Console.prototype.create = function(ax, ay, bx, by, cx, cy){
        if (ax == null || ay == null || bx == null || by == null || cx == null || cy == null) {
            throw new ConsoleError("Введите координаты вершин треугольника!");
        }
        var tr = this.canv.addTriangle(
                new Point(ax, ay),
                new Point(bx, by),
                new Point(cx, cy) );        
        tr.showId();
        log.call(this, "Команда выполнена успешно");
    };

    //Выделяет треугольники с заданными ID
    Console.prototype.select = function(args){
        var selectedTriangles;
        if (args.length === 0) {
            this.canv.select(this.canv.triangles);
        } else {
            selectedTriangles = [];
            for (var i=0; i<this.canv.triangles.length; i++){
                for (var k=0; k<args.length; k++){
                    if (this.canv.triangles[i].id === args[k]){
                        selectedTriangles.push(this.canv.triangles[i]);
                    }
                }
            }
            this.canv.select(selectedTriangles);
        }
        log.call(this, "Команда выполнена успешно");
    };

    //Показывает список треугольников
    Console.prototype.list = function(){
        var ids = [];
        for (var i=0; i<this.canv.triangles.length; i++){
            ids.push(this.canv.triangles[i].id);
        }
        log.call(this, ids.length ? ids.join(' ') : "Не найдено ни одного треугольника");
    };

    //Выполняет перенос выделенных треугольников на dx и dy
    Console.prototype.translate = function(dx, dy){
        if (dx === undefined && dy===undefined ) throw new ConsoleError("Введите два коэффициента перемещения!");
        dx = dx || 0;
        dy = dy || 0;
        this.canv.translateSelected(dx, dy);
        log.call(this, "Команда выполнена успешно");
    };

    //Поворачивает выделенные треугольники относительно центра прямоугольника выделения на заданный угол
    Console.prototype.rotate = function(deg){
        if (deg === undefined ) throw new ConsoleError("Введите угол поворота!")
        deg = deg / 180 * Math.PI;
        this.canv.rotateSelected(deg);
        log.call(this, "Команда выполнена успешно");
    };

    //Масштабирует выделенные треугольники в sx и sy раз по x и y
    //Если sy не задан, вместо него используется sx
    Console.prototype.scale = function(sx, sy){
        if (sx === undefined && sy===undefined ) throw new ConsoleError("Введите один или два коэффициента масштабирования!");
        sy = sy || sx;
        this.canv.scaleSelected(sx, sy);
        log.call(this, "Команда выполнена успешно");
    };

    //Удаляет выделенные треугольники
    Console.prototype.removeTriangles = function(){
        this.canv.removeSelected();
        log.call(this, "Команда выполнена успешно");
    };

    //Очищает вывод консоли
    Console.prototype.clear = function() {
        this.$output.empty();
        log.call(this, "Команда выполнена успешно");
    };

    //Задает цвет выделенных треугольников
    Console.prototype.color = function(fill, contour) {
        if (fill === undefined || contour===undefined ) throw new ConsoleError("Необходимо задать оба цвета!");
        this.canv.setColorSelected(fill, contour)
        log.call(this, "Команда выполнена успешно");
    };

    return Console;
})();