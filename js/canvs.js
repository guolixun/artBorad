class Draw {
    constructor (elements) {
        const { canvas, color, lineWidth, operations, imageFile, downloadLink, textBox } = elements; // 控制画布的元素
        this.type = 'pencil'; // 类型初始化为铅笔
        this.canvas = canvas; // canvas元素
        this.context = canvas.getContext('2d'); // 获取canvas的2d上下文对象
        this.canvasWidth = canvas.width; // 画布的宽度
        this.canvasHeight = canvas.height; // 画布的高度
        this.canvasBackground = '#ffffff'; // 画布的背景色
        this.isDrawing = false; // 是否在绘画中
        this.color = color; // 处理颜色的DOM元素
        this.lineWidth = lineWidth; // 处理线宽的DOM元素
        this.operations = operations; // 包含所有操作的元素
        this.imageFile = imageFile; // 用于倒入图片的文件元素
        this.downloadLink = downloadLink; // 用于下载图片的元素
        this.image = new Image(); // 绘制形状时用到
        this.historyImage = new Image(); // 处理重做和撤销时用到
        this.historyUrls = []; // 存放每一步的base64 url
        this.currentHistoryIndex = -1; // 当前历史记录的索引
        this.textBox = textBox;
        this.textFlag = false;
        this.textContent = '';
        this.ifFontPop = false; // 字体弹窗显示状态
    }
    init () {
        let originX = null, originY = null; // 同于存放每次鼠标点击（mousedown）时的坐标
        const { offsetLeft, offsetTop } = this.canvas;
        this.autoSetSize();
        this.clear(); // 给画布一个白色的背景

        this.operations.addEventListener('click', (event) => {
            const handleClick = this.handleOperations();
            const handleCurrentClick = handleClick[event.target.id]; // 根据按下的操作按钮，选择不同的处理事件
            handleCurrentClick && handleCurrentClick();
        }, false);

        this.canvas.addEventListener('mousedown', (event) => {
            //文本
            if(this.type=='font') {
                this.X1 = event.offsetX;
                this.Y1 = event.offsetY;
                const textBox = document.getElementById('textBox')
                if (this.textFlag) {
                    this.textContent = this.textBox.innerText;
                    this.textFlag = false;
                    textBox.innerHTML = "";
                    $('#textBox').hide();
                    this.drawFont(parseInt(textBox.style.left), parseInt(textBox.style.top));
                } else if (!this.textFlag) {
                    this.textFlag = true;
                    $('#textBox').show();
                    textBox.style.left = this.X1 + 'px';
                    textBox.style.top = this.Y1 + 'px';
                }
            }

            this.isDrawing = true;
            this.image.src = this.canvas.toDataURL('image/png'); // 将当前图片转换为base64路径
            const { clientX, clientY } = event;
            originX = clientX - offsetLeft;
            originY = clientY - offsetTop;
            // 初始化context
            this.context.moveTo(originX, originY);
            this.context.lineWidth = this.lineWidth.value;
            this.context.strokeStyle = this.color.value;
            this.context.fillStyle = this.color.value;
            this.context.beginPath();
        }, false);

        // 当鼠标从画布上离开或者鼠标放开时，当前这步绘画结束
        this.canvas.addEventListener('mouseleave', () => { this.endOfDrawing(); }, false);

        this.canvas.addEventListener('mouseup', () => { this.endOfDrawing(); }, false);

        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isDrawing) {
                const { clientX, clientY } = event;
                const x = clientX - offsetLeft;
                const y = clientY - offsetTop;
                let newOriginX = originX, newOriginY = originY;
                let distanceX = Math.abs(x-originX);
                let distanceY = Math.abs(y-originY);

                // 让形状左上角的坐标永远大于右下角坐标，保证图形能正常绘制
                if (x < originX) newOriginX = x;
                if (y < originY) newOriginY = y;

                // (x, y)为鼠标移动的过程中在画布上的坐标，(originX, originY)为鼠标点击时在画布上的坐标，
                //（newOriginX, newOriginY）为绘制形状（比如矩形）时形状左上角的坐标
                const mousePosition = { x, y, originX, originY, newOriginX, newOriginY, distanceX, distanceY };
                let handleMousemove = this.handleMousemove();
                let currentHandleMousemove = handleMousemove[this.type]; // 根据当前类型的不同采取不同的操作
                currentHandleMousemove && currentHandleMousemove(mousePosition);
            }
        }, false);
    }
    //重置画布
    autoSetSize () {
        // 把变化之前的画布内容copy一份，然后重新画到画布上
        let imgData = this.context.getImageData(0,0,this.canvas.width,this.canvas.height);
        const pageWidth = document.documentElement.clientWidth;
        const pageHeight = document.documentElement.clientHeight;//window.screen.availHeight ;//document.body.clientHeight;
        canvas.width = pageWidth-20;
        canvas.height = pageHeight-20;
        this.context.putImageData(imgData,0,0);
    }
    // 在绘制形状的过程中需要重新绘制，否则会画出移动过程中的图像
    reDraw () {
        this.context.clearRect(0,0,this.canvasWidth,this.canvasHeight);
        this.context.drawImage(this.image, 0, 0);
        this.context.beginPath();
    }
    // 绘画结束
    endOfDrawing () {
        if (this.isDrawing) {
            this.context.closePath();
            this.isDrawing = false;
            this.addHistory();
        }
    }

    /**
     * 绘制文本
     * @note: 自动识别换行,如果文本中含有换行符则以换行符为准,否则自动换行
     * @param x
     * @param y
     */
    drawFont (x, y) {
        var temp = "";
        var row = [];
        let fontSize = $('#fontSize').val();
        let font = fontSize + " " + $('#fontFamily').val();
        this.context.font = font;
        this.context.fillStyle = this.color;
        this.context.textBaseline = "top";
        if (this.textContent.indexOf("\n") >= 0) {
            row = this.textContent.split("\n");
        } else {
            var chr = this.textContent.split("");
            for(var a = 0; a < chr.length; a++){
                if( this.context.measureText(temp).width < parseInt(this.textBox.style.width) ){
                    ;
                }else{
                    row.push(temp);
                    temp = "";
                }
                temp += chr[a];
            }
            row.push(temp);
        }
        let fontSizeInt = parseInt(fontSize); //用于动态分配行高,防止换行字体重叠
        for(var b = 0; b < row.length; b++){
            this.context.fillText(row[b],x,y+(b+1)*fontSizeInt);
        }
    }
    // 用背景色将画布填满
    clear() {
        this.context.fillStyle = this.canvasBackground;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    // 添加历史记录
    addHistory () {
        let dataUrl = this.canvas.toDataURL('image/png');
        this.historyUrls.push(dataUrl);
        let length = this.historyUrls.length;
        // if (length > 10) {
        //     this.historyUrls = this.historyUrls.slice(-10, length);
        // }
        this.currentHistoryIndex = this.historyUrls.length - 1;
    }
    // 点击操作按钮时触发的事件
    handleOperations () {
        return {
            pencil: () => { this.type = 'pencil'; }, // 铅笔按钮绑定的事件
            straightLine: () => { this.type = 'straightLine'; }, // 直线按钮绑定的事件
            rectangle: () => { this.type = 'rectangle'; }, // 矩形按钮绑定的事件
            //solidRectangle: () => { this.type = 'solidRectangle'; }, // 实心矩形按钮绑定的事件
            eraser: () => { this.type = 'eraser'; }, // 橡皮擦绑定的事件
            circle: () => { this.type = 'circle'; }, // 圆形按钮绑定的事件
            //solidCircle: () => { this.type = 'solidCircle'; }, // 实心圆形按钮绑定的事件
            arrow: () => { this.type = 'arrow'; }, // 箭头按钮绑定的事件
            font: () => {
                this.type = 'font';
                if(!this.ifFontPop){
                    // 弹出框
                    $('#fontDetail').show();
                }else{
                    $('#fontDetail').hide();
                }
                this.ifFontPop = !this.ifFontPop;
            },
            clear: () => { this.clear(); }, // 清除按钮绑定的事件
            image: () => { // 导入图片按钮绑定的事件
                this.imageFile.click();
                this.imageFile.onchange = (event) => {
                    let reader = new FileReader();
                    reader.readAsDataURL(event.target.files[0]);
                    reader.onload = (evt) => {
                        let img = new Image();
                        img.src = evt.target.result;
                        img.onload = () => {
                            this.context.drawImage(img, 0, 0); // 将图片画在画布上
                            this.addHistory();
                        };
                    }
                }
            },
            save: () => { // 保存按钮绑定的事件
                this.downloadLink.href = this.canvas.toDataURL('image/png');
                this.downloadLink.download = 'drawing.png';
                this.downloadLink.click();
            },
            redo: () => { // 重做按钮绑定的事件
                let length = this.historyUrls.length;
                let currentIndex = this.currentHistoryIndex + 1;
                if (currentIndex > length - 1 ) {
                    this.currentHistoryIndex = length - 1;
                    return;
                };
                this.currentHistoryIndex = currentIndex;
                this.historyImage.src = this.historyUrls[currentIndex];
                this.historyImage.onload = () => {
                    this.context.drawImage(this.historyImage, 0, 0);
                }
            },
            undo: () => { // 撤回按钮绑定的事件
                let currentIndex = this.currentHistoryIndex - 1;
                if (currentIndex < 0) {
                    currentIndex === -1 && this.clear();
                    this.currentHistoryIndex = -1;
                    return;
                }
                this.currentHistoryIndex = currentIndex;
                this.historyImage.src = this.historyUrls[currentIndex];
                this.historyImage.onload = () => {
                    this.context.drawImage(this.historyImage, 0, 0);
                }
            },
            color: () => {
                //点击触发取色板
                document.getElementById('palette').click();
            }
        }
    }
    // 不同类型的操作绑定在mousemove上的事件
    handleMousemove () {
        return {
            //画笔
            pencil: (mousePosition) => {
                const { x, y } = mousePosition;
                this.context.lineTo(x, y);
                this.context.stroke();
            },
            //箭头
            arrow: (mousePosition) => {
                let { x, y, originX, originY } = mousePosition;
                var headlen = 10;//自定义箭头线的长度
                var theta = 45;//自定义箭头线与直线的夹角，个人觉得45°刚刚好
                var arrowX, arrowY;//箭头线终点坐标
                // 计算各角度和对应的箭头终点坐标
                var angle = Math.atan2(originY - y, originX - x) * 180 / Math.PI;
                var angle1 = (angle + theta) * Math.PI / 180;
                var angle2 = (angle - theta) * Math.PI / 180;
                var topX = headlen * Math.cos(angle1);
                var topY = headlen * Math.sin(angle1);
                var botX = headlen * Math.cos(angle2);
                var botY = headlen * Math.sin(angle2);

                this.reDraw();

                //画直线
                this.context.moveTo(originX, originY);
                this.context.lineTo(x, y);

                arrowX = x + topX;
                arrowY = y + topY;
                //画上边箭头线
                this.context.moveTo(arrowX, arrowY);
                this.context.lineTo(x, y);

                arrowX = x + botX;
                arrowY = y + botY;
                //画下边箭头线
                this.context.lineTo(arrowX, arrowY);

                this.context.stroke();

                this.context.closePath();
            },
            //橡皮擦
            eraser: (mousePosition) => {
                const { x, y } = mousePosition;
                this.context.strokeStyle = this.canvasBackground;;
                this.context.lineTo(x, y);
                this.context.stroke();
                this.context.strokeStyle = this.color.value;
                this.context.fillStyle = this.color.value;
            },
            /*straightLine: (mousePosition) => {
                let { x, y, originX, originY } = mousePosition;
                this.reDraw();

                this.context.moveTo(originX, originY);
                this.context.lineTo(x, y);
                this.context.stroke();

                this.context.closePath();
            },*/
            //矩形框
            rectangle: (mousePosition) => {
                let {newOriginX, newOriginY, distanceX, distanceY  } = mousePosition;
                this.reDraw();
                this.context.rect(newOriginX, newOriginY, distanceX, distanceY);
                this.context.stroke();

                this.context.closePath();
            },
            //实心矩形
            /*solidRectangle: (mousePosition) => {
                let { newOriginX, newOriginY, distanceX, distanceY } = mousePosition;
                this.reDraw();
                this.context.fillRect(newOriginX, newOriginY, distanceX, distanceY);
                this.context.closePath();
            },*/
            //圆形
            circle: (mousePosition) => {
                let { newOriginX, newOriginY, distanceX, distanceY } = mousePosition;
                this.reDraw();

                let r = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                this.context.arc(distanceX + newOriginX, distanceY + newOriginY , r, 0, 2 * Math.PI);
                this.context.stroke();

                this.context.closePath();
            },
            //文本
            font: (mousePosition) => {
                let {newOriginX, newOriginY, distanceX, distanceY  } = mousePosition;
                // this.reDraw();
                // this.context.rect(newOriginX, newOriginY, distanceX, distanceY);
                // this.context.stroke();

                /*var input = new CanvasInput({
                    canvas: document.getElementById('canvas'),
                    x: 50,
                    y: 100,
                    fontSize: 18,
                    fontFamily: 'Arial',
                    fontColor: '#212121',
                    fontWeight: 'bold',
                    width: 300,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#000',
                    borderRadius: 3,
                    boxShadow: '1px 1px 0px #fff',
                    innerShadow: '0px 0px 5px rgba(0, 0, 0, 0.5)',
                    placeHolder: 'Enter message here...'
                });*/


            },
            /*solidCircle: (mousePosition) => {
                let { newOriginX, newOriginY, distanceX, distanceY } = mousePosition;
                this.reDraw();

                let r = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                this.context.arc(distanceX + newOriginX, distanceX + newOriginY , r, 0, 2 * Math.PI);
                this.context.fillStyle = this.color.value;
                this.context.fill();

                this.context.closePath();
            },*/
            clear: () => {
                this.clear();
            }
        }
    }
}

window.onload = () => {
    // 获取页面中的元素
    const canvas = document.getElementById('canvas');
    const color = document.getElementById('palette');
    const lineWidth = document.getElementById('lineWidth');
    const operations = document.getElementById('operations');
    const imageFile = document.getElementById('imageFile');
    const downloadLink = document.getElementById('downloadLink');
    const textBox = document.getElementById('textBox');

    const elements = {
        canvas,
        color,
        lineWidth,
        operations,
        imageFile,
        downloadLink,
        textBox
    };
    const draw = new Draw(elements);
    draw.init();
};
