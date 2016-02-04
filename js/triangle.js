var Triangle = (function(){
	var globalId = 1,
		listener = null;
	/*
		Создает экземпляр треугольника. Варианты вызова:
		new Triangle(canvas, A, B, C) //по трем точкам
		new Triangle(canvas) //все вершины в 0, 0
	*/
	function Triangle(canvas, A, B, C){
		if (!A) {
			A = new Point;
			B = new Point;
			C = new Point;
		}
		this.A = A.clone();
		this.B = B.clone();
		this.C = C.clone();
		this.canvas = canvas;
		this.path = canvas.makePath(this._getPathString());
		this.stroke = '#000';
		this.fill = '#fff';
		this.setColor();

		this.cap = new Matrix;

		this.id = globalId++;

		this.idLabel = null;

		if (listener) listener.newTriangle(this.id, this.A, this.B, this.C);
	}
	// Возвращает площадь треугольника, заданного тремя точками
	Triangle.area = function(A, B, C) {
		return 0.5 * Math.abs( (A.x - C.x)*(B.y - C.y) - (B.x - C.x)*(A.y - C.y) );
	};
	// 
	Triangle.prototype.getCap = function() {
		return this.cap.clone();
	};
	/*
		Возвращает true, если заданная принадлежит треугольнику
		иначе false
	*/
	Triangle.prototype.hasPoint = function(p) {
		var sqrt = Math.sqrt,
			av = this.getActualVertices(),
			sABP = Triangle.area(av.A, av.B, p),
			sACP = Triangle.area(av.A, av.C, p),
			sBCP = Triangle.area(av.B, av.C, p),
			sABC = Triangle.area(av.A, av.B, av.C);
		return Math.abs((sABP + sACP + sBCP) - sABC) <= Math.pow(10, -11);
	};
	// Возвращает SVG-строку для пути треугольника
	Triangle.prototype._getPathString = function(A, B, C) {
		if (A == null) {
			A = this.A;
			B = this.B;
			C = this.C;
		}
		return '' +
			"M " + A.x + " " + A.y +
			"L " + B.x + " " + B.y +
			"L " + C.x + " " + C.y +
			"L " + A.x + " " + A.y;
	};
	/*
		Возвращает объект вершин треугольника {A, B, C},
		после применения к ним текущего КАПа
	*/
	Triangle.prototype.getActualVertices = function() {
		var vA = new Vector(this.A.x, this.A.y),
			vB = new Vector(this.B.x, this.B.y),
			vC = new Vector(this.C.x, this.C.y),
			A = vA.multiply(this.cap).getPoint(),
			B = vB.multiply(this.cap).getPoint(),
			C = vC.multiply(this.cap).getPoint();
		return { A: A, B: B, C: C };
	};
	// (приватный) Обновляет SVG-путь треугольника на холсте
	Triangle.prototype._update = function() {
		var av = this.getActualVertices();
		this.path.attr('path', this._getPathString(av.A, av.B, av.C));
		updateId.call(this);
	};
	// задает новые вершины треугольника
	Triangle.prototype.setVertices = function(A, B, C) {
		this.A = A.clone();
		this.B = B.clone();
		this.C = C.clone();

		this._update();
	};
	// Возвращает центроид треугольника
	Triangle.prototype.getCentroid = function() {
		var av = this.getActualVertices(),
			centroidX = (av.A.x + av.B.x + av.C.x) / 3,
			centroidY = (av.A.y + av.B.y + av.C.y) / 3;
		return new Point(centroidX, centroidY);
	};
	// Готовит треугольник к удалению
	Triangle.prototype.remove = function() {
		this.path.remove();
		if (this.idLabel) this.idLabel.remove();
	};
	// Задает цвет треугольника (обводка, заливка)
	Triangle.prototype.setColor = function(stroke, fill) {
		if (stroke == null) stroke = this.stroke;
		if (fill == null) fill = this.fill;
		this.path.attr({
			stroke: stroke,
			fill: fill
		});
		this.stroke = stroke;
		this.fill = fill;
		return this;
	};

	// Умножает КАП треугольника на новый КАП
	var _multiplyCap = function(triangleId, capA, capB, capName) {
		capA.multiply(capB);
	};
	// Осуществляет перенос треугольника на dx, dy
	// Не числа и отрицательные числа игнорируем
	Triangle.prototype.translate = function(dx, dy){
		dx = Number(dx);
		dy = Number(dy);
		if (isNaN(dx) || isNaN(dy)) return;

		var mTranslate = new Matrix([
				[ 1,  0, 0],
				[ 0,  1, 0],
				[dx, dy, 1]
			]);
		_multiplyCap(this.id, this.cap, mTranslate, "mTranslate");
		this._update();
	};
	// Осуществляет масштабирование треугольника относительно центроида
	// Не числа и отрицательные числа игнорируем
	Triangle.prototype.scale = function(sx, sy, center) {
		sx = Number(sx);
		sy = Number(sy);
		if (isNaN(sx) || isNaN(sy) || sx <= 0 || sy <= 0) return;
		
		var mPreTranslate, mScale, mPostTranslate;
		if (center == null) center = this.getCentroid();

		mPreTranslate = new Matrix([
			[		 1,			0, 0],
			[		 0,			1, 0],
			[-center.x, -center.y, 1]
		]);
		mScale = new Matrix([
			[sx,   0,  0],
			[ 0,  sy,  0],
			[ 0,   0,  1]
		]);
		mPostTranslate = new Matrix([
			[		1,		  0, 0],
			[		0,		  1, 0],
			[center.x, center.y, 1]
		]);

		var cap = mPreTranslate
			.clone()
			.multiply(mScale)
			.multiply(mPostTranslate);

		_multiplyCap(this.id, this.cap, cap, "mScale");

		this._update();
	};
	// Осуществляет поворот треугольника относительно центроида на angle радиан
	Triangle.prototype.rotate = function(angle, center) {
		//не работаем с нечисловым углом
		if ( isNaN( Number(angle) ) ) return;

		var cos = Math.cos(angle),
			sin = Math.sin(angle),
			mPreTranslate, mRotate, mPostTranslate;

		if (center == null) center = this.getCentroid();

		mPreTranslate = new Matrix([
			[		 1,			0, 0],
			[		 0,			1, 0],
			[-center.x, -center.y, 1]
		]);
		mRotate = new Matrix([
			[ cos, sin, 0],
			[-sin, cos, 0],
			[   0,	 0, 1]
		]);
		mPostTranslate = new Matrix([
			[		1,		  0, 0],
			[		0,		  1, 0],
			[center.x, center.y, 1]
		]);


		var cap = mPreTranslate
			.clone()
			.multiply(mRotate)
			.multiply(mPostTranslate);

		_multiplyCap(this.id, this.cap, cap, "mRotate");

		this._update();
	};

	Triangle.prototype.showId = function() {
		var centroid;
		if (this.idLabel == null) {
			centroid = this.getCentroid();
			this.idLabel = this.canvas.makeText(centroid.x, centroid.y, '#' + this.id);
			this.idLabel.attr({
				'font-size': '14px'
			});
		} else {
			this.idLabel.attr('opacity', 1);
		}
		return this;
	};

	Triangle.prototype.hideId = function() {
		if (this.idLabel != null) {
			this.idLabel.attr('opacity', 0);
		}
	};

	function updateId() {
		var centroid;
		if (this.idLabel != null) {
			centroid = this.getCentroid();
			this.idLabel.attr({
				x: centroid.x,
				y: centroid.y
			});
		}
	}

	Triangle.prototype.setId = function(id){
		this.id = id;
		return this;
	}

	Triangle.prototype.setGlobal = function(gId){		
		globalId = gId;
	}

	Triangle.prototype.serialize = function(){
		var tmp = {};
		tmp.id = this.id;
		tmp.A = this.A;
		tmp.B = this.B;
		tmp.C = this.C;
		tmp.cap = this.cap;
		tmp.fill = this.fill;
		tmp.stroke = this.stroke;
		return tmp;
	}

	Triangle.prototype.applyAnyCap = function(anyCap){
		_multiplyCap(this.id, this.cap, anyCap, "anyCap");
		this._update();
		return this;
	}
	
	return Triangle;
})();
