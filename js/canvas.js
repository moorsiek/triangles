var Canvas = (function(){
        //мышка не занята
    var CANVAS_STATE_FREE = 0,
        //создание треугольника мышью
        CANVAS_STATE_NEW_STEP1 = 1,
        CANVAS_STATE_NEW_STEP2 = 2,
        //масштабирование мышью
        CANVAS_STATE_SCALE = 3,
        //поворот мышью
        CANVAS_STATE_ROTATE = 4,
        //перенос мышью
        CANVAS_STATE_TRANSLATE = 5,
        //выделение мышью
        CANVAS_STATE_SELECT = 6;
    /*
        Создает объект холста. $area - контейнер для SVG-холста
    */
    function Canvas($area) {
        this.state = CANVAS_STATE_FREE;
        this.A = new Point;
        this.B = new Point;
        this.C = new Point;
        this.$area = $($area);
        this.paper = Raphael($area[0], $area.width(), $area.height());
        this.triangle = null;
        this.ui = null;

        this.triangles = [];
        this.selection = null;
        this.selectedTriangles = null;

        this.setupHandlers();
    }
    //выделяет переданные треугольники (массив экземпляров Triangle)
    Canvas.prototype.select = function(triangles){
        var p = new Point(0,0),
            selection;
        if (this.selection) {
            selection = this.selection;
        } else {
            selection = this.selection = new Selection(this, p, p.clone());
        }
        this.selectedTriangles = selection.cover(triangles, Selection.DONT_FILTER);
        if (!this.selectedTriangles) {
            this.clearSelection();
        } else {
            this.selection.showRotateSpot();
        }
    };
    //удаляет выделенные треугольники
    Canvas.prototype.removeSelected = function() {
        var canvas, triangles;
        if (!(this.selectedTriangles && this.selectedTriangles.length)) return;

        canvas = this;
        //нельзя перебирать this.selectedTriangles, т. к. removeTriangle его модифицирует
        triangles = this.selectedTriangles.slice();
        triangles.forEach(function(t) {
            canvas.removeTriangle(t);
        });

        canvas.clearSelection();
    };
    //убирает выделение
    Canvas.prototype.clearSelection = function() {
        if (!this.selection) return;
        this.selection.remove();
        this.selection = null;
        this.selectedTriangles = null;
        this.off('.selection');
        this.ui.setCursor('default');
    };
    //выполняет вращение выделенных треугольников
    Canvas.prototype.rotateSelected = function(angle, c, dontCover) {
        var canvas;
        if (!(this.selectedTriangles && this.selectedTriangles.length)) return;

        canvas = this;
        if (c == null) c = this.selection.getCenter();
        this.selectedTriangles.forEach(function(t) {
            t.rotate(angle, c);
        });
        if (!dontCover) {
            canvas.selection.cover(canvas.selectedTriangles, Selection.DONT_FILTER);
        }
    };
    //выполняет масштабирование выделенных треугольников
    Canvas.prototype.scaleSelected = function(sx, sy, c) {
        var canvas;
        if (!(this.selectedTriangles && this.selectedTriangles.length)) return;

        canvas = this;
        if (c == null) c = this.selection.getCenter();
        this.selectedTriangles.forEach(function(t) {
            t.scale(sx, sy, c);
        });
        canvas.selection.cover(canvas.selectedTriangles, Selection.DONT_FILTER);
    };
    //выполняет перенос выделенных треугольников
    Canvas.prototype.translateSelected = function(dx, dy) {
        var canvas;
        if (!(this.selectedTriangles && this.selectedTriangles.length)) return;

        canvas = this;
        this.selectedTriangles.forEach(function(t) {
            t.translate(dx, dy);
        });
        canvas.selection.cover(canvas.selectedTriangles, Selection.DONT_FILTER);
    };
    //задает цвет выделенным треугольникам
    Canvas.prototype.setColorSelected = function(fill, stroke) {
        var canvas;
        if (!(this.selectedTriangles && this.selectedTriangles.length)) return;

        canvas = this;
        this.selectedTriangles.forEach(function(t) {
            t.setColor(fill, stroke);
        });
        canvas.selection.cover(canvas.selectedTriangles, Selection.DONT_FILTER);
    }
    //Возвращает угол ABC произвольного треугольника ABC по трем вершинам
    Canvas.getAbcAngle = function(A, B, C) {
        var sqrt = Math.sqrt,
            pow = Math.pow,
            abs = Math.abs,
            acos = Math.acos,
            AC, AB, BC, angle;

        //по теореме пифагора
        AC = sqrt( pow(A.x - C.x, 2) + pow(A.y - C.y, 2) ),
        AB = sqrt( pow(B.x - A.x, 2) + pow(B.y - A.y, 2) ),
        BC = sqrt( pow(B.x - C.x, 2) + pow(B.y - C.y, 2) ),
        //по теореме косинусов
        angle = acos( (pow(AC, 2) - pow(AB, 2) - pow(BC, 2) ) / (-2 * AB * BC) );

        return angle;
    };
    // возвращает true, если не совершается никакой операции мышью, иначе false
    Canvas.prototype.isFree = function() {
        return this.state === CANVAS_STATE_FREE;
    };
    /*
        Навешивает обработчики событий мыши на холст:
        обработчик перетаскивания,
        обработчик выделения
    */
    Canvas.prototype.setupHandlers = function() {
        var canvas = this,
            canScale = false,
            canRotate = false,
            //режим масштабирования, xy, x или y (опущенное фиксируется)
            scaleMode = 'xy',
            mouseDownPoint;

        canvas
        .on('mousemove.persistent', function(e){
            var p, selection, touch;

            if (!canvas.isFree()) return;

            if (canvas.selection) { //если есть выделение
                p = new Point(e.theX, e.theY);  //определяем координаты точки, где произошло зажатие
                selection = canvas.selection;  

                if (touch = selection.isBorderTouched(p)) {  //если точка попала в границу выделения +5пикс 
                    canvas.ui.setCursor(touch + '-resize'); //задаем курсор css
                    //задаем режим масштабирования
                    switch (touch) {
                        //фиксируем sx = 1
                        case 'n': case 's':
                            scaleMode = 'y';
                            break;
                        //фиксируем sy = 1
                        case 'w': case 'e':
                            scaleMode = 'x';
                            break;
                        //масштабируем по x и y
                        default:
                            scaleMode = 'xy';
                            break;
                    }
                    canScale = true;
                    canRotate = false;
                } else if (touch = selection.isRotateSpotTouched(p)) { //смотрит, попала ли точка в прямогугольник
                    canRotate = true;
                    canScale = false;
                } else if (selection.hasPoint(p)) { //внутри ли
                    canvas.ui.setCursor('move'); //курсор move
                    canScale = false;
                    canRotate = false;
                } else {
                    canvas.ui.setCursor('default');
                    canScale = false;
                    canRotate = false;
                }
            } else {
                canvas.ui.setCursor('default');
                canScale = false;
                canRotate = false;
            }
        })
        .on('mouseup.persistent', function(e){
            //отмена масштабирования, поворота, переноса и выделения мышью, если 
            //левая кнопка мыши была отпущена в той же координате, где и зажата
            if (!mouseDownPoint) return;
            if (mouseDownPoint.equals(new Point(e.theX, e.theY))) {
                if (canvas.state !== CANVAS_STATE_NEW_STEP1 && canvas.state !== CANVAS_STATE_NEW_STEP2) {
                    canvas.off('.selectionScale .selectionRotate .selectionTranslate .makeSelection');
                    canvas.state = CANVAS_STATE_FREE;
                    canvas._banNextEvents('mouseup');
                }
            }
            mouseDownPoint = null;
        })
        //shift+ЛКМ - добавить в выделение
        //alt+ЛКМ - исключить из выделения
        //ЛКМ - выделить данный треугольник
        .on('click.persistent', function(e){
            var p = new Point(e.theX, e.theY),
                tt;

            if (!canvas.isFree()) return;

            tt = canvas.getTriangleByPoint(p);
            if (tt) {
                if (canvas.selectedTriangles) {
                    if (e.shiftKey) {
                        canvas.select(canvas.selectedTriangles.concat([tt]));
                    }
                    else if (e.altKey) {
                        canvas.select( canvas.selectedTriangles.filter(function(triangle){ return triangle !== tt }) );
                    } else {
                        canvas.select([tt]);
                    }
                } else {
                    canvas.select([tt]);
                }
                event.stopImmediatePropagation();
            }
        })
        .on('mousedown.persistent', function(e){
            mouseDownPoint = new Point(e.theX, e.theY);

            var p1 = new Point(e.theX, e.theY), //first point
                tt; //translateTriangle

            if (!canvas.isFree()) return;

            if (canRotate) {
                //Вращение курсором
                canvas.selection.hideRotateSpot();
                canvas.ui.setCursor('url("css/rotate_cur.png") 16 16, default');
                canvas.state = CANVAS_STATE_ROTATE;

                canvas
                    .on('mousemove.selectionRotate', function(e){
                        Point.prototype.str = function() { return this.x + ' ' + this.y; };
                        var p2 = new Point(e.theX, e.theY),
                            c = canvas.selection.getCenter(),
                            //угол между векторами из c в p1 и из c в p2
                            angle = Canvas.getAbcAngle(p1, c, p2);

                        //определяем направление поворота по знаку псевдоскалярного произведения
                        //векторов из центра вращения в прошлую и текущую координату указателя
                        var direction = 0 < ((p1.x - c.x) * (p2.y - c.y) - (p2.x - c.x) * (p1.y - c.y));
                        angle = direction ? angle : -angle;
                        p1 = p2;
                        canvas.rotateSelected(angle, c);
                    })
                    .on('mouseup.selectionRotate mouseleave.selectionRotate', function(e) {
                        canvas._banNextEvents('click');

                        canvas.selection.showRotateSpot();
                        canvas.off('.selectionRotate');
                        canvas.selection.cover(canvas.selectedTriangles, Selection.DONT_FILTER);
                        canvas.state = CANVAS_STATE_FREE;
                    });
            } else if (canScale) {
                //Масштабирование курсором
                canvas.selection.hideRotateSpot();
                canvas.state = CANVAS_STATE_SCALE;

                canvas
                    .on('mousemove.selectionScale', function(e) {
                        var p2 = new Point(e.theX, e.theY),
                            center = canvas.selection.getCenter(),
                            selectionSize = canvas.selection.getSize(),
                            sx = Math.abs(2 * (p2.x - center.x) / selectionSize.width),
                            sy = Math.abs(2 * (p2.y - center.y) / selectionSize.height);

                        //фиксируем масштаб по одной из осей, если начали тащить
                        //не за уголок
                        if (scaleMode === 'x') sy = 1;
                        else if (scaleMode === 'y') sx = 1;

                        canvas.scaleSelected(sx, sy, center);
                    })
                    .on('mouseup.selectionScale mouseleave.selectionScale', function(e) {
                        canvas._banNextEvents('click');

                        canvas.selection.showRotateSpot();
                        canvas.off('.selectionScale');
                        canvas.state = CANVAS_STATE_FREE;
                    });
            } else if (canvas.selection && canvas.selection.hasPoint(p1)) {
                //Перемещение выделения курсором
                canvas.state = CANVAS_STATE_TRANSLATE;

                canvas
                    .on('mousemove.selectionTranslate', function(e) {
                        var p2 = new Point(e.theX, e.theY),
                            dx = p2.x - p1.x,
                            dy = p2.y - p1.y;
                        p1 = p2;
                        canvas.translateSelected(dx, dy);
                    })
                    .on('mouseup.selectionTranslate mouseleave.selectionTranslate', function(e) {
                        canvas._banNextEvents('click');

                        canvas.off('.selectionTranslate');
                        canvas.state = CANVAS_STATE_FREE;
                    });
            } else if (tt = canvas.getTriangleByPoint(p1)) {
                return;
                //Перемещение треугольника курсором
                canvas.state = 1;

                canvas
                    .on('mousemove.translate', function(e) {
                        var p2 = new Point(e.theX, e.theY),
                            dx = p2.x - p1.x,
                            dy = p2.y - p1.y;
                        p1 = p2;
                        tt.translate(dx, dy);
                    })
                    .on('mouseup.translate mouseleave.translate', function(e) {
                        canvas._banNextEvents('click');

                        canvas.off('.translate');
                        canvas.state = CANVAS_STATE_FREE;

                    });
            } else {
                //Выделение курсором
                if (canvas.selection) canvas.selection.remove();
                canvas.selection = null;
                canvas.triangle = null;

                canvas.selection = new Selection(canvas, p1, p1);
                canvas.state = CANVAS_STATE_SELECT;

                canvas
                    .on('mousemove.makeSelection', function(e) {
                        var p2 = new Point(e.theX, e.theY);
                        canvas.selection.setVertices(p1, p2);
                    })
                    .on('mouseup.makeSelection mouseleave.makeSelection', function(e) {
                        canvas._banNextEvents('click');

                        canvas.off('.makeSelection');
                        canvas.state = CANVAS_STATE_FREE;
                        var selected = canvas.selection.cover(canvas.triangles); //проверка попали ли треугольники, которые в канвас

                        if (!selected) {
                            canvas.clearSelection();
                            canScale = false;
                        } else {
                            canvas.selectedTriangles = selected;
                            canvas.selection.showRotateSpot();
                        }
                    });
            }
        });
    };    
    //Задает экземпляр класса UI
    Canvas.prototype.setUI = function(ui){
        this.ui = ui;
    };
    //(Приватный) исправляет координаты мыши в объекте события
    function fixe(e) {
        e = $.event.fix(e);
        var offset = this.$area.offset();
        e.theX = e.pageX - offset.left;
        e.theY = e.pageY - offset.top;
        return e;
    };
    (function(){
        var banned;
        //запрещает заданные типы событий в данный момент времени
        Canvas.prototype._banNextEvents = function() {
            var args;
            if (arguments.length === 0) {
                return;
            }

            banned = [];
            args = Array.prototype.slice.call(arguments);
            for (var i = 0, ilim = args.length; i < ilim; ++i) {
                if (args[i].type) {
                    banned.push(String(args[i].type).toLowerCase());
                } else {
                    banned.push(String(args[i]).toLowerCase());
                }
            }

            setTimeout(function(){
                banned = false;
            }, 0);
        };
        //проверяет, разрешено ли в данный момент времени событие заданного типа
        Canvas.prototype._eventAllowed = function(e){
            if (!banned) return true;

            if (e.type) {
                e = String(e.type).toLowerCase();
            } else {
                e = String(e).toLowerCase();
            }

            return (-1 === banned.indexOf(e));
        };
    })();
    /*
        Навешивает jquery обработчики событий на холст и дополняет
        их предварительной коррекций координат мыши 
    */
    Canvas.prototype.on = function() {
        //копируем недомассив arguments
        var args = Array.prototype.slice.call(arguments),
            idx = args[1] && args[1].call ? 1 : 2,
            oldCallback = args[idx],
            canvas = this;
        args[idx] = function(e) {
            if (!canvas._eventAllowed(e)) return;
            e = fixe.call(canvas, e);
            oldCallback(e);
        };

        var $canvas = $(this.paper.canvas);
        $canvas.on.apply($canvas, args);

        return this;
    };
    // Снимает jquery обработчики событий с холста
    Canvas.prototype.off = function() {
        var $canvas = $(this.paper.canvas);
        $canvas.off.apply($canvas, arguments);

        return this;
    };
    // Добавляет экземпляр Triangle на холст
    Canvas.prototype.addTriangle = function(A, B, C) {
        if (A == null) {
            A = new Point;
            B = new Point;
            C = new Point;
        }
        var triangle = new Triangle(this, A, B, C);
        this.triangles.push(triangle);
        return triangle;
    }
    // Возвращает количество треугольников на холсте
    Canvas.prototype.trianglesCount = function() {
        return this.triangles.length;
    };
    // Запускает добавление треугольника на холст мышью
    Canvas.prototype.newTriangle = function(){
        var canvas = this;

        if (!canvas.isFree()){
            return;
        }

        canvas.state = CANVAS_STATE_NEW_STEP1;

        canvas.ui.disableCreate(); //запрещение создания треугольника, если нажата кнопка
        canvas.clearSelection();

        canvas.triangle = canvas.addTriangle();
            
        canvas.on('click.newTriangle', function(e){
            if (canvas.state === CANVAS_STATE_NEW_STEP1) {
                canvas.state = CANVAS_STATE_NEW_STEP2;
                canvas.A.set(e.theX, e.theY);
                return;
            }
            if (canvas.state === CANVAS_STATE_NEW_STEP2) {
                canvas.state = CANVAS_STATE_FREE;

                canvas.B.set(e.theX, canvas.A.y);
                canvas.C.set(canvas.A.x, e.theY);

                canvas.off('.newTriangle');
                canvas.triangle.setVertices(canvas.A, canvas.B, canvas.C);

                //обнуляем координаты точек
                canvas.A.set(0, 0);
                canvas.B.set(0, 0);
                canvas.C.set(0, 0);

                //показываем id треугольника, когда он окончательно создан
                canvas.triangle.showId();

                return;
            }
        })
        .on('mousemove.newTriangle', function(e){
            if (canvas.state === CANVAS_STATE_NEW_STEP2) {
                canvas.triangle.setVertices(canvas.A, new Point(e.theX, canvas.A.y), new Point(canvas.A.x, e.theY));
            }
        }); 
    };

    // Удаляет треугольник с холста
    Canvas.prototype.removeTriangle = function(triangle){
        triangle.remove();

        var idx = this.triangles.indexOf(triangle);
        this.triangles.splice(idx, 1);
        this.triangle = this.triangles[this.triangles.length - 1] || null;

        this.ui.enableCreate();
    };
    // Создает SVG путь на холсте
    Canvas.prototype.makePath = function(pathStr) {
        return this.paper.path(pathStr);
    };
    // Создает текст на холсте
    Canvas.prototype.makeText = function(x, y, text) {
        return this.paper.text(x, y, text);
    };
    // Создает и возвращает изображение на холсте
    Canvas.prototype.makeImage = function() {
        return this.paper.image.apply(this.paper, arguments);
    };
    /*
        Возвращает первый найденный треугольник, которому принадлежит
        заданная точка
    */
    Canvas.prototype.getTriangleByPoint = function(p) {
        var triangles = this.triangles;
        for (var i = triangles.length - 1; i >= 0; --i) {
            if (triangles[i].hasPoint(p)) {
                return triangles[i];
            }
        }
    };

    // удаляет все треугольники
    Canvas.prototype.removeAllTriangles = function() {
        if (!this.triangles.length) return;
        this.triangles.forEach(function(t) {
            t.remove();
        });

        this.triangles = [];
    };

    //заставляет треугольники записать себя в файл, возвращает json
    Canvas.prototype.serializeTriangles = function(){
        if (!this.triangles) return;
        var tempArr=[];
        this.triangles.forEach(function(item){
            tempArr.push(item.serialize() );
        })
        return JSON.stringify(tempArr);
    }

    //берет данные из json, создает новые треугольники
    Canvas.prototype.unSerializeTriangles = function(json){
        var canvas = this;
        canvas.removeAllTriangles();

        var jsonTriangles = JSON.parse(json);
        var max = Math.max.apply(Math, jsonTriangles.map(function(i){return i.id;}));

        jsonTriangles.forEach(function(i){
            console.log(i);
            canvas.addTriangle(
                new Point(i["A"]["x"], i["A"]["y"]),
                new Point(i["B"]["x"], i["B"]["y"]),
                new Point(i["C"]["x"], i["C"]["y"])
                )
                .setId(i["id"])
                .showId()
                .applyAnyCap(i.cap)
                .setColor(i["stroke"], i["fill"])
                .setGlobal(max+1);
        });

        canvas.clearSelection();
    }


    return Canvas;
})();