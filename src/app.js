var GameConfig = {
    gravity:-900,// 重力
    birdDelay:0.15,
    groundV:2, //屏幕速度
    birdSize:{width:20, height:20},
    birdForce:350,//鸟飞的力量，May the force be with you!
    pipeLrDest:160,  //管子左右间距
    pipeUdDest:150,  //管子上下间距
    pipeSize:{width:52, heigth:320},
    pipeRange:{top:440, bottom:130},//管子上下口的刷新范围
};

var GameUtil = {
    randomInt:function(s,e){
        return s + Math.floor(Math.random() * (e-s+1));
    },
};

var BirdSprite = cc.Sprite.extend({
    _vel:0, //速度，方向向上
    _bird:null,
    _actionRotate:null,
    _actionFly:null,

    ctor:function() {
        this._super();

        var birdType = GameUtil.randomInt(0, 2);
        var bird = new cc.Sprite("#bird"+ birdType +"_0.png");

        var aniBird = new cc.Animation();
        var frameCache = cc.spriteFrameCache;
        for (var i = 0; i < 3; ++i)
        {
            var name = "bird"+ birdType +"_" + i + ".png";
            var frame = frameCache.getSpriteFrame(name);
            aniBird.addSpriteFrame(frame);
        }
        aniBird.setDelayPerUnit(GameConfig.birdDelay);
        var actBird = cc.animate(aniBird);
        this._actionFly = cc.repeatForever(actBird);
        bird.runAction(this._actionFly);

        this.addChild(bird);
        this._bird = bird;

        return true;
    },

    refreshVel:function(dt){
        this.y += this._vel * dt + GameConfig.gravity * dt * dt / 2;
        if (this.y + GameConfig.birdSize.height / 2 > cc.winSize.height)
            this.y = cc.winSize.height - GameConfig.birdSize.height / 2;
        this._vel += GameConfig.gravity * dt;
    },

    fly:function(){
        this._vel = GameConfig.birdForce;

        this._bird.stopAction(this._actionRotate);
        var act1 = cc.rotateTo(0.25, -35);
        var act2 = cc.rotateTo(0.25, 0);
        var act3 = cc.rotateTo(0.5, 90);
        this._actionRotate = cc.sequence(act1, act2, act3);
        this._bird.runAction(this._actionRotate);
    },

    amIDead:function(rect){
        var bird = cc.rect(this.x - GameConfig.birdSize.width / 2,
        this.y - GameConfig.birdSize.height / 2,
            GameConfig.birdSize.width,
            GameConfig.birdSize.height)
        var r = cc.rectIntersectsRect(bird, rect);
        if (r)
            this._bird.stopAction(this._actionFly);
        return r;
    }
});

var PipeSprite = cc.Sprite.extend({
    _up:null,
    _down:null,
    ctor:function(pipeNum) {
        this._super();

        this._up = new cc.Sprite("#pipe" + pipeNum + "_up.png");
        this._down = new cc.Sprite("#pipe" + pipeNum + "_down.png");

        this._up.y = GameConfig.pipeUdDest / 2 + this._up.height / 2;
        this._down.y = - GameConfig.pipeUdDest / 2 - this._down.height / 2;

        this.addChild(this._up);
        this.addChild(this._down);

        this.refreshPosY();

        return true;
    },

    refreshPosY:function() {
        this.y = GameUtil.randomInt(GameConfig.pipeRange.bottom + GameConfig.pipeUdDest / 2,
            GameConfig.pipeRange.top - GameConfig.pipeUdDest / 2);
    },

    getCollisionRect:function(){
        var rs = {};
        var pos = this.convertToWorldSpace(this._up.getPosition());
        rs.up = cc.rect(pos.x - this._up.width / 2, pos.y - this._up.height / 2,
            this._up.width, this._up.height);
        pos = this.convertToWorldSpace(this._down.getPosition());
        rs.down = cc.rect(pos.x - this._down.width / 2, pos.y - this._down.height / 2,
            this._down.width, this._down.height);
        return rs;
    }
});

var ScoreboardSprite = cc.Sprite.extend({
    _score:0,
    _numberSprites:null,
    _numberWidth:24,

    ctor:function(){
        this._super();
        this._numberSprites = [];
        var sp = new cc.Sprite("#number_0.png");
        this._numberSprites.push(sp);
        this.addChild(sp);
        return true;
    },

    scoreAddOne:function(){
        this.setScore(this._score + 1);
    },

    //此函数只接受整数参数，小数会被向下取整
    setScore:function(s){
        s = Math.floor(s);
        this._score = s;
        var len = s.toString().length;
        this._setScoreLength(len);
        var baseNum = 1;
        var xStart =  (this._numberSprites.length - 1) * this._numberWidth / 2;
        for(var i = 0; i < this._numberSprites.length; ++i)
        {
            var num = Math.floor(s / baseNum) % 10;
            var sp = this._numberSprites[i];
            sp.setSpriteFrame("number_" + num + ".png");
            sp.x = xStart;
            xStart -= this._numberWidth;
            baseNum *= 10;
        }
    },

    _setScoreLength:function(len){
        if (len <= this._numberSprites.length)
        {
            for (var i = len; i < this._numberSprites.length; ++i)
            {
                this.removeChild(this._numberSprites[i]);
            }
            this._numberSprites.splice(len, this._numberSprites.length - len);
        }
        else
        {
            for(var i = 0; i < len - this._numberSprites.length; ++i)
            {
                var sp = new cc.Sprite();
                this._numberSprites.push(sp);
                this.addChild(sp);
            }
        }
    }
});

var GamePlayLayer = cc.Layer.extend({
    _bird:null,
    _isStart:false,
    _isEnd:false,
    _ground1:null,
    _ground2:null,
    _tip:null,
    _pipe1:null,
    _pipe2:null,
    _scoreboard:null,

    ctor:function() {
        this._super();
        return true;
    },

    onEnter:function() {
        this._super();

        cc.eventManager.addListener({
            event : cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches : true,
            onTouchBegan : function(touch, event) { return true; },
            onTouchEnded : function(touch, event) {
                var target = event.getCurrentTarget();
                if (!target._isStart)
                {
                    target._isStart = true;
                    target._tip.setVisible(false);
                }
                if (!target._isEnd)
                {
                    target._bird.fly();
                }
            }
        }, this);

        this.initData();
        this.scheduleUpdate();
    },

    update:function(dt) {
        if (this._isStart)
        {
            //检测碰撞
            var rs = this._pipe1.getCollisionRect();
            if (this._bird.amIDead(rs.up) || this._bird.amIDead(rs.down))
            {
                this.gameEnd();
                return;
            }

            rs = this._pipe2.getCollisionRect();
            if (this._bird.amIDead(rs.up) || this._bird.amIDead(rs.down))
            {
                this.gameEnd();
                return;
            }

            if (this._bird.y - GameConfig.birdSize.height / 2 <
                this._ground1.y + (1-this._ground1.anchorY) * this._ground1.height)
            {
                this.gameEnd();
                return;
            }

            //刷新鸟的位置
            this._bird.refreshVel(dt);

            //刷新管子的位置并通过管子的位置变化计分
            if (this._pipe1.x < -this._pipe1.width / 2)
            {
                this._pipe1.x = this._pipe2.x + GameConfig.pipeLrDest;
                this._pipe1.refreshPosY();
            }
            if (this._pipe2.x < -this._pipe2.width / 2)
            {
                this._pipe2.x = this._pipe1.x + GameConfig.pipeLrDest;
                this._pipe2.refreshPosY();
            }
            if (this._pipe1.x > this._bird.x && this._pipe1.x - GameConfig.groundV <= this._bird.x)
                this._scoreboard.scoreAddOne();
            if (this._pipe2.x > this._bird.x && this._pipe2.x - GameConfig.groundV <= this._bird.x)
                this._scoreboard.scoreAddOne();
            this._pipe1.x -= GameConfig.groundV;
            this._pipe2.x -= GameConfig.groundV;
        }

        //刷新地面的位置
        if(this._ground1.x < 0)
            this._ground1.x += this._ground1.width + this._ground2.width;
        if(this._ground2.x < 0)
            this._ground2.x += this._ground1.width + this._ground2.width;
        this._ground1.x -= GameConfig.groundV;
        this._ground2.x -= GameConfig.groundV;
    },

    gameEnd:function() {
        this.unscheduleUpdate();
        this._isEnd = true;
        var act = cc.moveTo(1,
            cc.p(this._bird.x, GameConfig.birdSize.height / 2 + this._ground1.y + (1-this._ground1.anchorY) * this._ground1.height));
        this._bird.runAction(act);

        var size = cc.winSize;
        var spEnd = new cc.Sprite("#text_game_over.png");
        spEnd.x = size.width / 2;
        spEnd.y = size.height / 2 + 200;
        this.addChild(spEnd);

        var startSpriteNormal = new cc.Sprite("#button_play.png");
        var startSpriteSelected = new cc.Sprite("#button_play.png");
        startSpriteSelected.y -= 5;
        var startMenuItem = new cc.MenuItemSprite(
            startSpriteNormal,
            startSpriteSelected,
            function(){
                cc.director.popScene();
                var scene = new GamePlayScene();
                cc.director.pushScene(new cc.TransitionFade(0.5, scene));
            }, this);

        var mu = new cc.Menu(startMenuItem);
        mu.x = size.width / 2;
        mu.y = size.height / 2;
        this.addChild(mu);
    },

    initData:function() {
        var size = cc.winSize;

        //初始化背景
        var isNight = (GameUtil.randomInt(0, 1) == 0);
        if (isNight)
        {
            var bg = new cc.Sprite("#bg_night.png");
            bg.x = size.width / 2;
            bg.y = size.height / 2;
            this.addChild(bg);
        }
        else
        {
            var bg = new cc.Sprite("#bg_day.png");
            bg.x = size.width / 2;
            bg.y = size.height / 2;
            this.addChild(bg);
        }

        //初始化管道
        var pipeNum = isNight ? 2 : 1;

        var pipe1 = new PipeSprite(pipeNum);
        pipe1.x = size.width + pipe1.width / 2;
        this.addChild(pipe1);
        this._pipe1 = pipe1;

        var pipe2 = new PipeSprite(pipeNum);
        pipe2.x = pipe1.x + GameConfig.pipeLrDest;
        this.addChild(pipe2);
        this._pipe2 = pipe2;

        //初始化地面
        this._ground1 = new cc.Sprite("#land.png");
        this._ground1.anchorX = 1;
        this._ground1.anchorY = 0.5;
        this._ground1.x = this._ground1.width;
        this._ground1.y = 0;
        this.addChild(this._ground1);
        this._ground2 = new cc.Sprite("#land.png");
        this._ground2.anchorX = 1;
        this._ground2.anchorY = 0.5;
        this._ground2.x = this._ground1.x+this._ground1.width;
        this._ground2.y = 0;
        this.addChild(this._ground2);

        //初始化鸟
        var bird = new BirdSprite();
        bird.setPosition(cc.p(size.width / 2 - 70, size.height / 2));
        this.addChild(bird);

        this._bird = bird;

        //初始化tip
        this._tip = new cc.Sprite("#tutorial.png");
        this._tip.x = size.width / 2;
        this._tip.y = size.height / 2;
        this.addChild(this._tip);

        //初始化计分板
        this._scoreboard = new ScoreboardSprite();
        this._scoreboard.x = size.width / 2;
        this._scoreboard.y = size.height / 2 + 100;
        this.addChild(this._scoreboard);
    }
});

var GamePlayScene = cc.Scene.extend({
    onEnter:function(){
        this._super();
        var layer = new GamePlayLayer();
        this.addChild(layer);
    }
});

var HelloWorldLayer = cc.Layer.extend({
    ctor:function () {
        this._super();

        var size = cc.winSize;
        var frameCache = cc.spriteFrameCache;
        frameCache.addSpriteFrames("res/Plist.plist", "res/Plist.png");

        var bg = new cc.Sprite("#bg_day.png");
        bg.x = size.width / 2;
        bg.y = size.height / 2;
        this.addChild(bg);

        var title = new cc.Sprite("#title.png");
        title.x = size.width / 2;
        title.y = size.height / 2 + 100;
        this.addChild(title);

        var bird = new cc.Sprite();
        bird.x = size.width / 2;
        bird.y = size.height / 2;
        var aniBird = new cc.Animation();
        for (var i = 0; i < 3; ++i)
        {
            var name = "bird2_" + i + ".png";
            var frame = frameCache.getSpriteFrame(name);
            aniBird.addSpriteFrame(frame);
        }
        aniBird.setDelayPerUnit(GameConfig.birdDelay);
        aniBird.setRestoreOriginalFrame(true);
        var actBird = cc.animate(aniBird);
        bird.runAction(cc.repeatForever(actBird));
        this.addChild(bird);

        var startSpriteNormal = new cc.Sprite("#button_play.png");
        var startSpriteSelected = new cc.Sprite("#button_play.png");
        startSpriteSelected.y -= 5;
        var startMenuItem = new cc.MenuItemSprite(
            startSpriteNormal,
            startSpriteSelected,
        this.menuItemStartCallback, this);

        var mu = new cc.Menu(startMenuItem);
        mu.x = size.width / 2;
        mu.y = size.height / 2 - 100;
        this.addChild(mu);

        return true;
    },

    menuItemStartCallback:function() {
        var scene = new GamePlayScene();
        cc.director.pushScene(new cc.TransitionFade(0.5, scene));
    }
});

var HelloWorldScene = cc.Scene.extend({
    onEnter:function () {
        this._super();
        var layer = new HelloWorldLayer();
        this.addChild(layer);
    }
});

