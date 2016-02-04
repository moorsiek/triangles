var Selection = (function(){
    // Создает экземпляр прямоугольного выделения по двум противостоящим
    // вершинам
    function Selection(canvas, A, B) {
        this.canvas = canvas;
        this._applyVertices(A, B);
        this.path = canvas.makePath(this._getPathString());
        this.path.attr({
            'stroke-dasharray': '- ',
            stroke: '#000'
        });
        //добавляем значок под вращения под прямоугольник выделения
        this.rotateSpot = canvas.makeImage("css/rotate_cur.png",
            (this.A.x + this.B.x) / 2 - 16,
            this.A.y + 20,
            32, 32
        );
        this.hideRotateSpot();
    }
    //Константы класса:
    //не проверять покрытие треугольников выделением, а использовать все
    //переданные
    Selection.DONT_FILTER = true;
    // Скрывает значок вращения
    Selection.prototype.hideRotateSpot = function() {
        this.rotateSpot.attr('opacity', 0);
    };
    // Показывает значок вращения
    Selection.prototype.showRotateSpot = function() {
        this.rotateSpot.attr('opacity', 1);
    };
    // Возвращает SVG-строку для прямоугольника выделения
    Selection.prototype._getPathString = function() {
        return '' +
            "M " + this.A.x + " " + this.A.y +
            "L " + this.A.x + " " + this.B.y +
            "L " + this.B.x + " " + this.B.y +
            "L " + this.B.x + " " + this.A.y +
            "L " + this.A.x + " " + this.A.y;
    };
    // Возвращает точку в центре прямоугольника выделения
    Selection.prototype.getCenter = function() {
        return new Point(
            this.A.x + (this.B.x - this.A.x) / 2,
            this.B.y + (this.A.y - this.B.y) / 2
        );
    };
    /* (Приватный)
        Задает новые вершины прямоугольника выделения, причем
        первая из них становится нижней левой, а вторая верхней
        правой
    */
    Selection.prototype._applyVertices = function(A, B) {
        var points = [
                A, B,
                new Point(A.x, B.y),
                new Point(B.x, A.y)
            ];

        points.forEach(function(p){
            if (p.x < A.x || p.y > A.y) {
                A = p;
            }
            if (p.x > B.x || p.y < B.y) {
                B = p;
            }
        });
        this.A = A.clone();
        this.B = B.clone();
    };
    // Задает новые вершины выделения
    Selection.prototype.setVertices = function(A, B) {
        this._applyVertices(A, B);
        this._update();
    };
    // Возвращает размер прямоугольника выделения
    Selection.prototype.getSize = function() {
        return {
            width: this.B.x - this.A.x,
            height: this.A.y - this.B.y
        };
    };
    // (приватный) обновляет SVG-строку пути прямоугольника выделения
    Selection.prototype._update = function() {
        this.path.attr('path', this._getPathString());
        this.rotateSpot.attr({
            x: (this.A.x + this.B.x) / 2 - 16,
            y: this.A.y + 20
        });
    };
    // Готовит выделение к удалению
    Selection.prototype.remove = function() {
        this.path.remove();
        this.rotateSpot.remove();
    };
    // Возвращает true, если заданная точка находится в области касания
    // значка вращения, иначе false
    Selection.prototype.isRotateSpotTouched = function(p) {
        //значок 32x32
        var NW = new Point(
                (this.A.x + this.B.x) / 2 - 16,
                this.A.y + 20
            ),
            SE = new Point(
                NW.x + 32,
                NW.y + 32
            );
        return (p.x >= NW.x && p.y <= SE.y && p.x <= SE.x && p.y >= NW.y);
    };
    // Возвращает место касания (n,e,s,w,ne,se,sw или nw), если заданная точка
    //находится в области касания рамки выделения, иначе false
    Selection.prototype.isBorderTouched = function(p) {
        var t /*= threshold*/ = 5, //порог различия граница-неграница
            A = this.A,
            B = this.B,
            abs = Math.abs;
        //Стороны
        if (abs(p.y - B.y) <= t && ((p.x - A.x) > t && (p.x - B.x) < -t)) {
            return 'n'; //северная
        }
        if (abs(p.y - A.y) <= t && ((p.x - A.x) > t && (p.x - B.x) < -t)) {
            return 's'; //южная
        }
        if (abs(p.x - A.x) <= t && ((p.y - A.y) < -t && (p.y - B.y) > t)) {
            return 'w'; //западная
        }
        if (abs(p.x - B.x) <= t && ((p.y - A.y) < -t && (p.y - B.y) > t)) {
            return 'e'; //восточная
        }
        //Углы, квадрат t на t в углу выделения
        if (abs(p.y - B.y) <= t && abs(p.x - B.x) <= t) {
            return 'ne'; //северо-восточный
        }
        if (abs(p.y - B.y) <= t && abs(p.x - A.x) <= t) {
            return 'nw'; //северо-западный
        }
        if (abs(p.y - A.y) <= t && abs(p.x - B.x) <= t) {
            return 'se'; //юго-восточный
        }
        if (abs(p.y - A.y) <= t && abs(p.x - A.x) <= t) {
            return 'sw'; //юго-западный
        }
        return false;
    };
    // Проверяет, принадлежит ли заданная точка прямоугольнику выделения
    Selection.prototype.hasPoint = function(p) {
        return (p.x >= this.A.x && p.y <= this.A.y && p.x <= this.B.x && p.y >= this.B.y);
    };
    /*
        Определяет, какие треугольники захватываются текущим прямоугольником
        выделения, и сокращает прямоугольник выделения до минимального,
        но охватывающего те же треугольники
        возвращает false, если ни один треугольник не попал в выделение,
        инае - список охваченных треугольников
    */
    Selection.prototype.cover = function(triangles, dontFilter) {
        if (!triangles.length) return false;

        var select = this,
            A,
            B,
            t,
            av;

        if (!dontFilter) {
            //исключаем треугольник, которые не затронуло выделение
            triangles = triangles.filter(function(t){
                var contained = false,
                    av = t.getActualVertices();
                //принадлежит ли хоть одна вершина треугольника выделению?
                [av.A, av.B, av.C].forEach(function(p){
                    if (select.hasPoint(p)) {
                        contained = true;
                        return false;
                    }
                });
                if (contained) return true;
                
                //принадлежит ли хоть одна вершина выделения треугольнику?
                [
                    select.A, select.B,
                    new Point(select.A.x, select.B.y),
                    new Point(select.B.x, select.A.y)
                ].forEach(function(p){
                    if (t.hasPoint(p)) {
                        contained = true;
                        return false;
                    }
                });

                return contained;
            });

            //Ни один треугольник не попал в выделение
            if (!triangles.length) return false;
        }

        // Задаемся начальными значениями для вершин по первой вершине
        // первого треугольника
        av = triangles[0].getActualVertices(); 
        A = av.A.clone();
        B = av.A.clone();

        //Заменяем выделение на минимальное, но охватывающее
        //все выеделенные треугольники
        for (var i = triangles.length - 1; i >= 0; --i) {
            t = triangles[i];
            av = t.getActualVertices();
            [av.A, av.B, av.C].forEach(function(p){
                if (p.x < A.x) {
                    A.x = p.x;
                }
                if (p.y > A.y) {
                    A.y = p.y;
                }
                if (p.x > B.x) {
                    B.x = p.x;
                }
                if (p.y < B.y) {
                    B.y = p.y;
                }
            });
        }

        this._applyVertices(A, B);
        this._update();

        return triangles;
    };

    return Selection;
})();