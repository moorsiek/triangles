var Vector = (function(){
    /*
        Создает экземпляр обобщенных координат точки. Варианты вызова:
        Vector(x, y)
        Vector(point) //копирует координаты с экземпляра точки (Point)
    */
    function Vector(x, y) {
        if (x.x) {
            x = [x.x, x.y, 1];
        } else {
            x = [x, y, 1];
        }
        this.v = x;
    }
    // Умножает вектор как вектор-строку на матрицу
    Vector.prototype.multiply = function(M) {
        var r = [],
            m = M.m,
            v = this.v;

        for (var i = 0; i < 3; ++i) {
            r[i] = 0;
            for (var j =0; j < 3; ++j) {
                r[i] += v[j] * m[j][i];
            }
        }

        this.v = r;

        return this;
    };
    // Возвращает экземпляр Point на основе обобщенных координат
    Vector.prototype.getPoint = function() {
        return new Point(this.v[0], this.v[1]);
    };

    return Vector;
})();