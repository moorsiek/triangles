var Matrix = (function(){
    /*
        Создает экземпляр матрицы из массива массивов, представляющих
        строки матрицы
    */
    function Matrix(m) {
        if (!m) {
            m = [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ];
        }
        this.m = m;
    }
    /*
        Умножает матрицу на другую матрицу и возвращает обратно
        этот экземпляр, уже измененный
    */
    Matrix.prototype.multiply = function(B) {
        var C = [[], [], []],
            A = this.m,
            B = B.m;
        for (var i = 0; i < 3; ++i) {
            for (var j = 0; j < 3; ++j) {
                C[i][j] = 0;
                for (var k = 0; k < 3; ++k) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        this.m = C;

        return this;
    };
    // возвращает копию матрицы
    Matrix.prototype.clone = function() {
        var newM = [];
        for (var i = this.m.length - 1; i >= 0; --i) {
            newM.unshift(this.m[i].slice());
        }
        return new Matrix(newM);
    };

    return Matrix;
})();