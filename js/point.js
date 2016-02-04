var Point = (function(){
    /* 
        Создает экземпляр точки. Варианты вызова:
        new Point //точка с x = 0, y = 0
        new Point(x, y)
        new Point(anotherPoint) //копирует координаты переданного экземпляра
    */
    function Point(x, y) {
        //если конструктор вызван без параметров
        if (x == null) {
            x = 0;
            y = 0;
        //если в x - объект Point или {x:..,y:..}
        } else if (x.x != null) {
            y = x.y;
            x = x.x;
        }
        this.x = x;
        this.y = y;
    }
    // Задает новые координаты точки
    Point.prototype.set = function(x, y) {
        if (x.x) {
            y = x.y;
            x = x.x;
        }
        this.x = x;
        this.y = y;
    };
    // Сравнивает с другим Point: true, если равны, иначе false
    Point.prototype.equals = function(p){
        return this.x === p.x && this.y === p.y;
    };
    // Возвращает копию данного объекта
    Point.prototype.clone = function(){
        return new Point(this);
    };

    return Point;
})();