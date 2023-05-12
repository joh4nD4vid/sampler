
let global = {
    body : document.querySelector('body')
};


class Element {

    constructor(className, contentOption, tagOption) {
        this.className = className;
        this.contentOption = contentOption;
        this.tagOption = tagOption;

        this.make();
    }

    make() {
        let content = this.contentOption || '';
        let tag = this.tagOption || 'div';

        let element = document.createElement(tag);
        element.classList.add(this.className);
        element.innerHTML = content;

        this.element = element;
    }

    get() {
        return this.element;
    }

    style(name, value) {
        this.element.style[name] = value;
    }

    appendToAndGetRef(target) {
        target.append(this.element);
        return target.querySelector('.'+this.className);
    }

}


class PlayButton {

    constructor( target, action, readingHead ) {
        this.action = action;
        this.target = target;
        this.readingHead = readingHead;
        this.init();
    }

    init() {
        this.value = false;
        this.make();
        this.vue();
    }

    make() {
        let div = new Element('playPause');
        this.div = div.appendToAndGetRef( this.target );
        this.events();
    }

    events() {
        this.div.addEventListener('click', ()=>{
            this.click();
        });
    }

    click( doubleClick ) {
        this.switch();
        this.vue();
        this.toAction();
        if ( doubleClick ) this.click(false);
    }

    switch() {
        this.value = !this.value;
    }

    vue() {
        let toAdd = this.value? 'playMode' : 'pauseMode';
        let toRemove = this.value? 'pauseMode' : 'playMode';
        this.div.classList.add( toAdd );
        this.div.classList.remove( toRemove );
    }

    toAction() {
        if ( this.value ) return this.action.on( this.readingHead );
        return this.action.off( this.readingHead );
    }

}


class ReadingHead {

    constructor( soundVisualization, soundData, soundActions ) {
        this.soundVisualization = soundVisualization;
        this.soundData = soundData;
        this.soundActions = soundActions;
        this.target = this.soundActions.sampleZone;

        this.init();
    }

    init() {
        this.div = false;
        this.pos = false;
        this.speed = false;
        this.limit = false;
        this.interval = false;

        this.calculateSpeed();
    }

    calculateSpeed() {
        let width = this.soundVisualization.canvasWidth;
        let timeInSeconds = this.soundData.soundInfos.time;
        this.speed = (timeInSeconds/width)*1000;
    }

    make() {
        this.div = new Element('reading-head').appendToAndGetRef(this.target);
    }

    start(ref) {
        ref = ref || this;
        ref.make();
        ref.pos = 0;
        //TODO Pas besoin de recalculer updateLimit si c'est un sample.
        ref.updateLimit();
        ref.interval = setInterval(() => ref.move(), ref.speed);
        ref.soundActions.playSampleZoneSound();
    }

    stop(ref) {
        ref = ref || this;
        ref.div.remove();
        ref.div = false;
        ref.pos = false;
        ref.limit = false;
        window.clearInterval( ref.interval );
        ref.soundActions.stopSampleZoneSound();
    }

    move() {
        this.pos+=1;
        this.div.style.left = this.pos+'px';
        this.isOver();
    }

    updateLimit() {
        this.limit = this.soundActions.sampleZoneInfos.endSamplePos - this.soundActions.sampleZoneInfos.startSamplePos;
    }

    isOver() {
        if ( this.pos >= this.limit ) {
            if ( this.soundActions.loopValue ) {
                this.pos = 0;
                this.soundActions.playButton.click(true);
            }
            else {
                this.pos = this.limit;

                if ( this.soundActions.playButton ) {
                    this.soundActions.playButton.click(false);
                }
                else {
                    this.stop();
                }
            }
        }
    }

}


class SoundTime {

    constructor(timeInSecs) {
        this.timeInSecs = timeInSecs;
        this.getMins();
        this.getSecs();
    }

    getMins() {
        this.mins = parseInt(this.timeInSecs/60);
        this.minWord = this.mins>1 ? 'mins ' : 'min ';
    }

    getSecs() {
        this.secs = Math.floor(this.timeInSecs%60);
        this.secWord = this.secs>1 ? 'secs ' : 'sec ';
        this.totalSecWord = this.timeInSecs>1 ? 'secs ' : 'sec ';
    }

    getTimeInSecs() {
        return this.timeInSecs+totalSecWord;
    }

    getTimeInMins() {
        return this.mins + this.minWord + this.secs + this.secWord;
    }

}


class SoundLoading {

    constructor( sampleShelf, target ) {
        this.sampleShelf = sampleShelf;
        this.target = target;
        this.checkAudioContext();
        this.authorizedTypes = [
            'audio/mpeg', 'audio/wav'
        ];
        this.nonValidTypeMessage = 'The file extension is not correct.';
        this.createButton();
    }

    checkAudioContext() {
        global.audioCtx = typeof( global.audioCtx ) === 'undefined' ? new AudioContext() : global.audioCtx;
    }

    createButton() {
        //TODO Changer le bouton par défaut.
        let button = new Element('pickSoundButton', 'Pick a sound', 'input');
        this.button = button.appendToAndGetRef( this.target );
        this.button.setAttribute('type', 'file');

        this.events();
    }

    events() {
        this.button.addEventListener( 'change', () => {
            this.getFile();
        });
    }

    getFile() {
        this.file = this.button.files[0];
        if (this.testType() ) {
            this.getDataFile();
        }
        else {
            //TODO Créer un petit message d'avertissement visible pour les fichiers non valides. Classe abstraite popup... Sous classe message d'avertissement
            console.log( this.nonValidTypeMessage );
        }
    }

    testType() {
        let validation = false;
        this.authorizedTypes.forEach( (aValidType)=>{
            if ( this.file.type == aValidType ) {
                validation = true;
            }
        });
        return validation;
    }

    getDataFile() {
        this.reader = new FileReader();
        this.reader.onload = () => { this.dataLoaded(); }
        this.reader.readAsArrayBuffer( this.file );
        this.startLoading();
    }

    startLoading() {
        this.button.remove();
        this.createLoader();
    }

    createLoader() {
        let loader = new Element('loader');
        this.loader = loader.appendToAndGetRef( this.target );
    }

    removeLoader() {
        this.loader.remove();
    }

    dataLoaded() {
        this.removeLoader();
        let data = this.reader.result;
        let canvasTarget = new OriginalSoundElements( this.target );

        let infos = {
            canvasWidth : 720,
            canvasHeight : 74,
            canvasTarget : canvasTarget
        };
        this.soundData = new GetSoundData(data, this.file.name, infos, this.sampleShelf);
    }

}


class OriginalSoundElements {

    constructor( target ) {
        this.target = target;
        return this.make();
    }

    make() {
        let wrap = new Element('wrap-canvas');
        let wrapVisualisation = new Element('wrap-visualisation');
        let wrapInterfaceSampling = new Element('wrap-interface-sampling');
        let samplingZone = new Element('sampling-zone');
        let startSamplingZone = new Element('start-sampling-zone');
        let endSamplingZone = new Element('end-sampling-zone');
        let canvas = new Element('visualisation', false, 'canvas');

        this.wrap = wrap.appendToAndGetRef( this.target );
        this.wrapVisualisation = wrapVisualisation.appendToAndGetRef( this.wrap );
        this.wrapInterfaceSampling = wrapInterfaceSampling.appendToAndGetRef( this.wrapVisualisation );
        this.samplingZone = samplingZone.appendToAndGetRef( this.wrapInterfaceSampling );
        this.startSamplingZone = startSamplingZone.appendToAndGetRef( this.samplingZone );
        this.endSamplingZone = endSamplingZone.appendToAndGetRef( this.samplingZone );
        this.canvas = canvas.appendToAndGetRef( this.wrapVisualisation );

        return this.canvas;
    }

}


class SoundVisualization {

    constructor(soundData, props, sampleShelf) {
        this.sampleShelf = sampleShelf;
        this.soundData = soundData;
        this.data = soundData.lowResSound;
        this.props = props;
        this.initCanvas();
    }

    initCanvas() {
        this.canvasWidth = this.props.width;
        this.canvasHeight = this.props.height;

        this.canvas = this.props.target;
        this.canvas.height = this.canvasHeight;
        this.canvas.width = this.canvasWidth;

        this.canvasCtx = this.canvas.getContext('2d');

        this.initPosition();
        this.drawBackground();
    }

    initPosition() {
        this.pos = this.canvas.getBoundingClientRect();
    }

    drawBackground() {
        this.canvasCtx.fillStyle = 'rgb(240, 240, 240)';
        this.canvasCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.getMinAndMax();
    }

    getMinAndMax(test) {
        let testMode = test || false;

        let output = this.data.reduce((acc, curr)=>{

            let min, max;

            if (acc.min==null || acc.max==null) {
                min = curr;
                max = curr;
            }

            else {
                min = curr < acc.min ? curr : acc.min;
                max = curr > acc.max ? curr : acc.max;
            }

            return {min : min, max : max};

        }, {min : null, max : null});

        if (!testMode) {
            this.dataMinValue = output.min;
            this.dataMaxValue = output.max;
            this.moveTheCurve();
        }
    }

    moveTheCurve() {
        if (this.dataMinValue < 0) {
            let moveFactor = Math.abs(this.dataMinValue);

            this.dataMinValue+=moveFactor;
            this.dataMaxValue+=moveFactor;

            this.data = this.data.map(value=>value+moveFactor);

            this.inverseCurve();
        }
    }

    inverseCurve() {
        let inverseFactor = this.dataMaxValue;
        this.data = this.data.map( value=>Math.abs(value - inverseFactor) );
        this.stretchTheCurve();
    }

    stretchTheCurve() {
        this.data = this.data.map(value => value * this.canvasHeight / this.dataMaxValue);
        this.getTheWidthStroke();
    }

    getTheWidthStroke() {
        this.widthStroke = this.canvasWidth / this.data.length;
        this.draw();
    }

    draw() {
        let x=0;

        for(var i = 0; i < this.data.length; i++) {
            let y = this.data[i];

            this.canvasCtx.fillStyle = 'rgb(40, 40, 40)';
            this.canvasCtx.fillRect(x, y, 2, this.canvasHeight-y);

            x += this.widthStroke;
        }
        this.ready();
    }

    ready() {
        if (!this.props.isASample) {
            new OriginalSoundActions( this, this.soundData, this.sampleShelf );
        }
    }

}


class GetSoundData {

    constructor(data, name, infos, sampleShelf) {
        this.sampleShelf = sampleShelf || false;
        this.infos = infos || false;
        this.data = data;
        this.name = name;
        this.soundInfos = {};
        this.testAudioData();
    }

    testAudioData() {
        let isAnArrayBuffer = this.data instanceof( ArrayBuffer );

        if ( isAnArrayBuffer ) { this.decodeFromArrayBuffer(); }
        else { this.decodeFromArray(); }
    }

    decodeFromArrayBuffer() {
        global.audioCtx.decodeAudioData(this.data, audioBuffer=>{ this.prepareBuffer( audioBuffer ) });
    }

    decodeFromArray() {
        let audioBuffer = global.audioCtx.createBuffer ( this.infos.nbOfChannels, this.infos.dataLength, this.infos.samplingRatefrequency );

        for ( let i = 0 ; i<this.infos.nbOfChannels ; i++ ) {
            const nowBuffering = audioBuffer.getChannelData( i );

            for ( let j = 0 ; j<nowBuffering.length ; j++ ) {
                nowBuffering[j] = this.data[i][j];
            }
        }

        this.prepareBuffer( audioBuffer );
    }

    prepareBuffer(buffer) {
        this.buffer = buffer;
        this.getSoundTime();
        this.soundInfos.sampleRate = this.getSampleRate(true);

        this.makeLowSamplingRateSound();
    }

    getNbOfEntriesForLowSamplingRateSound() {
        let anEntryWidth = 4;
        return this.infos.canvasWidth / anEntryWidth;
    }

    makeLowSamplingRateSound() {
        let nbOfEntries = this.getNbOfEntriesForLowSamplingRateSound();
        let leftChannelData = this.buffer.getChannelData(0);
        let sampleSpacing = parseInt(this.buffer.length/nbOfEntries);

        this.lowResSound = [];

        for (let i=0 ; i<nbOfEntries ; i++) {
            let index = i*sampleSpacing;
            this.lowResSound.push( leftChannelData[index] );
        }

        this.soundDataIsReady();
    }

    getSoundTime() {
        let totalSecs = (this.buffer.length / this.buffer.sampleRate);
        this.soundInfos.time = totalSecs;

        let formattedTime = new SoundTime(totalSecs);
        this.soundInfos.formattedTime = formattedTime.getTimeInMins();
    }

    getSampleRate( display ) {
        return display ? this.buffer.sampleRate+'Hz' : this.buffer.sampleRate;
    }

    soundDataIsReady() {
        let props = {
            width : this.infos.canvasWidth,
            height : this.infos.canvasHeight,
            target : this.infos.canvasTarget,
            isASample : this.infos.isASample
        };
        this.soundVisualization = new SoundVisualization( this, props, this.sampleShelf );
    }

    playSound(start) {
        this.source = global.audioCtx.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.connect(global.audioCtx.destination);
        this.source.start(0, start);
    }

    stopSound() {
        this.source.stop(0);
        this.source = null;
    }

    getSampleData() {
        let nbOfChannels = this.buffer.numberOfChannels;
        let samplesDatas = [];

        for ( let i=0 ; i<nbOfChannels ; i++ ) {
            samplesDatas.push( this.buffer.getChannelData(i) );
        }

        return samplesDatas;
    }

}


class OriginalSoundActions {

    constructor( soundVisualization, soundData, sampleShelf ) {
        this.sampleShelf = sampleShelf;
        this.soundVisualization = soundVisualization;
        this.soundData = soundData;
        this.targets();
        this.interface();
    }

    targets() {
        this.wrap = document.querySelector('.wrap-canvas');
        this.zone = document.querySelector('.wrap-interface-sampling');
        this.sampleZone = document.querySelector('.sampling-zone');
    }

    interface() {
        this.readingHead = new ReadingHead( this.soundVisualization, this.soundData, this );

        this.initSampleZoneInfos();
        this.makeWrapButtons();

        let action = {
            on : this.readingHead.start,
            off : this.readingHead.stop
        };
        this.playButton = new PlayButton( this.wrapButton, action, this.readingHead );

        this.makeButton('loop', this.topWrapButton);
        this.makeButton('cut', this.topWrapButton);
        this.showSampleZone();
        this.events();
    }

    showSampleZone() {
        this.sampleZone.style.display = 'block';
    }

    makeWrapButtons() {
        this.wrapButton = new Element('wrap-buttons').appendToAndGetRef(this.wrap);
        this.topWrapButton = new Element('top-wrap-buttons').appendToAndGetRef(this.wrap);
        this.updateIconsPositions();
    }

    makeButton(buttonName, wrap) {
        this[buttonName+'Div'] = new Element(buttonName).appendToAndGetRef(wrap);
    }

    events() {
        this.wrap.addEventListener('mouseenter', e=>{
            this.showInfo();
        });
        this.wrap.addEventListener('mouseleave', e=>{
            this.hideInfo();
        });

        this.zone.addEventListener('mousedown', e=>{
            this.sampleZoneClick(e);
        });

        window.addEventListener('mouseup', e=>{
            this.sampleZoneEndClick();
        });

        this.loopDiv.addEventListener('click', e=>{
            this.loop();
        });
        this.cutDiv.addEventListener('click', e=>{
            this.cut();
        });

        this.zone.addEventListener('mouseenter', e=>{
            this.updateHoverCursor(e, 'start');
        });
        this.zone.addEventListener('mouseleave', e=>{
            this.updateHoverCursor(null, 'stop');
        });
        this.zone.addEventListener('mousemove', e=>{
            this.updateHoverCursor(e, 'move');
        });
    }

    playSampleZoneSound() {
        this.soundData.playSound(this.sampleZoneInfos.startSampleTime);
    }

    stopSampleZoneSound() {
        this.soundData.stopSound();
    }

    loop() {
        this.loopValue = typeof(this.loopValue)!=='undefined' ? !this.loopValue : true;
        this.displayLoopButton();
    }

    cut() {
        let allSoundDatas = this.soundData.getSampleData();
        let nthEntries = this.getNthEntriesToSliceSoundDataArray( allSoundDatas );

        let sampleData = this.sliceSoundDataArray( allSoundDatas, nthEntries );
        let samplesInfos = this.prepareSampleInfos( allSoundDatas );
        let sample = new Sample( this.soundData.name, sampleData, samplesInfos, this.sampleShelf );
        this.sampleShelf.saveSample( sample );
    }

    prepareSampleInfos( allSoundDatas ) {
        let sampleDuration = this.getSampleDuration();
        let frequency = this.soundData.getSampleRate(false);

        return {
            nbOfChannels : allSoundDatas.length,
            samplingRatefrequency : frequency,
            dataLength : sampleDuration * frequency
        };
    }

    getSampleDuration() {
        return this.sampleZoneInfos.endSampleTime - this.sampleZoneInfos.startSampleTime;
    }

    getNthEntriesToSliceSoundDataArray( allSoundDatas ) {
        let nbOfDataEntries = allSoundDatas[0].length;

        let startTimeCode = this.sampleZoneInfos.startSampleTime;
        let endTimeCode = this.sampleZoneInfos.endSampleTime;
        let totalDuration = this.soundData.soundInfos.time;

        return {
            start : this.getNthEntryFromTimeCode( startTimeCode, totalDuration, nbOfDataEntries ),
            end : this.getNthEntryFromTimeCode( endTimeCode, totalDuration, nbOfDataEntries )
        };
    }

    getNthEntryFromTimeCode ( timeCode, totalDuration, nbOfDataEntries ) {
        return ( nbOfDataEntries * timeCode ) / totalDuration;
    }

    sliceSoundDataArray( allSoundDatas, nthEntries ) {
        let output = [];
        allSoundDatas.forEach( ( aSampleDataChanel )=>{
            output.push( aSampleDataChanel.slice( nthEntries.start, nthEntries.end ) );
        });
        return output;
    }

    displayLoopButton() {
        if (this.loopValue) { this.loopDiv.classList.add('loopOn'); }
        else { this.loopDiv.classList.remove('loopOn'); }
    }

    sampleZoneClick(e) {
        if ( this.cursorState !== 'jumpStartBar' && this.cursorState !== 'jumpEndBar' ) {
            this.moveMode = this.prepareMoveModeInfos(e);
        }
        else {
            this.moveMode = false;
            this.jumpBar();
        }
    }

    prepareMoveModeInfos(e) {
        if ( this.cursorState!=='moveZone' ) {
            return {
                state : this.cursorState
            };
        }

        let cursorPos = this.getRelativePos(e, false);
        let startSamplePos = this.sampleZoneInfos.startSamplePos;
        let difference = cursorPos - startSamplePos;
        let endSamplePos = this.sampleZoneInfos.endSamplePos;
        let sampleLength = endSamplePos - startSamplePos;

        return {
            state : this.cursorState,
            difference : difference,
            sampleLength : sampleLength
        };
    }

    sampleZoneEndClick() {
        this.moveMode = false;
    }

    giveTimePos(pos) {
        let canvasWidth = this.soundVisualization.canvasWidth;
        let totalSecs = this.soundData.soundInfos.time;

        return pos * totalSecs / canvasWidth;
    }

    updateSampleZoneInfos(props, init) {
        init = init || false;
        this.sampleZoneInfos = init ? {} : this.sampleZoneInfos;

        for (let aPropName in props) {
            this.sampleZoneInfos[aPropName] = props[aPropName];
        }

        if (!init) { this.updateSampleZone(); }

        if ( this.playButton ) {
            if (this.playButton.value) { this.readingHead.updateLimit(); }
        }
    }

    updateSampleZone() {
        let startPos = this.sampleZoneInfos.startSamplePos;
        let endPos = this.sampleZoneInfos.endSamplePos;
        let width = this.soundVisualization.canvasWidth;

        this.sampleZone.style.left = startPos+'px';
        this.sampleZone.style.width = (endPos - startPos)+'px';
        this.updateIconsPositions();
    }

    updateIconsPositions() {
        let startPos = this.sampleZoneInfos.startSamplePos;
        let endPos = this.sampleZoneInfos.endSamplePos;
        let newPos = startPos + (endPos - startPos)/2;
        let halfWrapButtonWidth = 20;

        let newPosBottom = newPos - halfWrapButtonWidth+'px';
        let newPosTop = newPos - 2*halfWrapButtonWidth+'px';

        this.wrapButton.style.left = newPosBottom;
        this.topWrapButton.style.left = newPosTop;
    }

    initSampleZoneInfos() {
        let totalSecs = this.soundData.soundInfos.time;
        let width = this.soundVisualization.canvasWidth;

        let props = {
            startSampleTime : '0',
            displayedStartSampleTime : new SoundTime(0).getTimeInMins(),
            startSamplePos : '0',
            endSampleTime : totalSecs,
            displayedEndSampleTime : new SoundTime(totalSecs).getTimeInMins(),
            endSamplePos : width,
        };
        this.updateSampleZoneInfos(props, true);
    }

    getRelativePos(e, style) {
        this.mouseBarPos = e.clientX - this.soundVisualization.pos.left;
        return style ? this.mouseBarPos+'px' : this.mouseBarPos;
    }

    updateHoverCursor( e, action ) {
        if( action == 'stop' ) { return this.hideMouseBar(); }
        if( action == 'start' ) { this.showMouseBar(e); }
        if( action == 'move' ) { this.moveMouseBar(e); }
    }

    showMouseBar(e) {
        if ( this.mouseBar == null ) {
            let mouseoverBar = new Element('mouseover-bar');
            mouseoverBar.style('left', this.getRelativePos(e, true));
            this.mouseBar = mouseoverBar.appendToAndGetRef(this.zone);
        }
        this.whatIsTheHoverCursor(e);
    }

    moveMouseBar(e) {
        this.mouseBar.style.left = this.getRelativePos(e, true);
        this.isThereMoveMode(e);
    }

    isThereMoveMode(e) {
        if (!this.moveMode) {
            this.whatIsTheHoverCursor(e);
        }
        else {
            this.moveModeActions(e);
        }
    }

    moveModeActions(e) {
        this[this.moveMode.state](e);
    }

    moveStartBar(e) {
        let pos = this.getRelativePos(e, false);
        let timePos = this.giveTimePos(pos);

        let props = {
            startSampleTime: timePos,
            displayedStartSampleTime: new SoundTime(timePos).getTimeInMins(),
            startSamplePos: pos
        };

        this.updateSampleZoneInfos(props);

        this.rewindTest();
    }

    moveEndBar(e) {
        let pos = this.getRelativePos(e, false);
        let timePos = this.giveTimePos(pos);

        let props = {
            endSampleTime: timePos,
            displayedEndSampleTime: new SoundTime(timePos).getTimeInMins(),
            endSamplePos: pos
        };

        this.updateSampleZoneInfos(props);
    }

    moveZone(e) {
        let cursorPos = this.getRelativePos(e, false);
        let maxWidth = this.soundVisualization.canvasWidth;
        let startSamplePos = cursorPos - this.moveMode.difference;
        let endSamplePos = startSamplePos + this.moveMode.sampleLength;

        if (startSamplePos<0) {
            this.moveMode.sampleLength -= Math.abs(startSamplePos);
            this.moveMode.difference -= Math.abs(startSamplePos);
            startSamplePos = 0;
        }

        if (endSamplePos>maxWidth) {
            endSamplePos = maxWidth;
            this.moveMode.sampleLength = endSamplePos - startSamplePos;
        }

        let startSampleTime = this.giveTimePos(startSamplePos);
        let endSampleTime = this.giveTimePos(endSamplePos);

        let props = {
            startSampleTime : startSampleTime,
            displayedStartSampleTime : new SoundTime(startSampleTime).getTimeInMins(),
            startSamplePos : startSamplePos,
            endSampleTime : endSampleTime,
            displayedEndSampleTime : new SoundTime(endSampleTime).getTimeInMins(),
            endSamplePos : endSamplePos,
        };
        this.updateSampleZoneInfos(props);

        this.rewindTest();
    }

    rewindTest() {
        if ( this.playButton.value ) this.playButton.click(true);
    }

    jumpBar() {
        let timePos = this.giveTimePos(this.mouseBarPos);
        let props;

        if (this.cursorState == 'jumpStartBar') {
            props = {
                startSampleTime : timePos,
                displayedStartSampleTime : new SoundTime(timePos).getTimeInMins(),
                startSamplePos : this.mouseBarPos
            };

            this.rewindTest();
        }

        if (this.cursorState == 'jumpEndBar') {
            props = {
                endSampleTime : timePos,
                displayedEndSampleTime : new SoundTime(timePos).getTimeInMins(),
                endSamplePos : this.mouseBarPos
            };
        }

        this.updateSampleZoneInfos(props);
    }

    hideMouseBar() {
        this.mouseBar.remove();
        this.mouseBar = null;
    }

    whatIsTheHoverCursor(e) {
        let posX = this.mouseBarPos;
        let posStart = parseInt(this.sampleZoneInfos.startSamplePos);
        let posEnd = parseInt(this.sampleZoneInfos.endSamplePos);
        let thickBar = 5;

        let output;
        if ( posX < posStart-thickBar ) { output = 'jumpStartBar'; }
        if ( posX >= posStart-thickBar && posX <= posStart+thickBar ) { output = 'moveStartBar'; }
        if ( posX > posStart+thickBar && posX < posEnd-thickBar ) { output = 'moveZone'; }
        if ( posX >= posEnd-thickBar && posX <= posEnd+thickBar ) { output = 'moveEndBar'; }
        if ( posX > posEnd+thickBar ) { output = 'jumpEndBar'; }

        this.cursorState = output;
        this.showHoverCursor(output);
    }

    showHoverCursor(action) {
        let cursorStyle;
        switch(action) {
            case 'jumpStartBar' :
            case 'jumpEndBar' :
                cursorStyle = 'crosshair';
                break;
            case 'moveStartBar' :
            case 'moveEndBar' :
                cursorStyle = 'ew-resize';
                break;
            case 'moveZone' :
                cursorStyle = 'move';
                break;
        }
        this.zone.style.cursor = cursorStyle;
    }

    showInfo() {
        if ( this.infoBox == null ) {
            let time = this.soundData.soundInfos.formattedTime;
            let sampleRate = this.soundData.soundInfos.sampleRate;
            let name = this.soundData.name;

            let timeDiv = new Element('time-info', time).get();
            let sampleRateDiv = new Element('sample-rate-info', sampleRate).get();
            let nameDiv = new Element('name-info', name).get();

            let infoBox = new Element('infobox');
            infoBox.get().append(nameDiv, timeDiv, sampleRateDiv);

            this.infoBox = infoBox.appendToAndGetRef( this.wrap );
        }
    }

    hideInfo() {
        this.infoBox.remove();
        this.infoBox = null;
    }

}


class SampleActions {

    constructor( soundVisualization, soundData, wrap, forAKeySample ) {
        this.soundVisualization = soundVisualization;
        this.soundData = soundData;
        this.wrap = wrap;
        this.forAKeySample = forAKeySample;
        this.sampleZone = this.wrap.querySelector('.sample-zone');
        this.interface();
    }

    interface() {
        this.readingHead = new ReadingHead( this.soundVisualization, this.soundData, this );

        this.initSampleZoneInfos();
        if ( !this.forAKeySample ) this.makePlayButton();
    }

    makePlayButton() {
        this.makeWrapButtons();

        let action = {
            on : this.readingHead.start,
            off : this.readingHead.stop
        };
        this.playButton = new PlayButton( this.wrapButton, action, this.readingHead );
    }

    initSampleZoneInfos() {
        let totalSecs = this.soundData.soundInfos.time;
        let width = this.soundVisualization.canvasWidth;

        let props = {
            startSampleTime : '0',
            displayedStartSampleTime : new SoundTime(0).getTimeInMins(),
            startSamplePos : '0',
            endSampleTime : totalSecs,
            displayedEndSampleTime : new SoundTime(totalSecs).getTimeInMins(),
            endSamplePos : width,
        };
        this.updateSampleZoneInfos( props );
    }

    updateSampleZoneInfos(props) {
        this.sampleZoneInfos = props;
        this.updateLimit();
    }

    updateLimit() {
        this.limit = this.sampleZoneInfos.endSamplePos - this.sampleZoneInfos.startSamplePos;
    }

    makeWrapButtons() {
        this.wrapButton = new Element('wrap-buttons').appendToAndGetRef(this.wrap);
    }

    playSampleZoneSound() {
        this.soundData.playSound(0);
    }

    stopSampleZoneSound() {
        this.soundData.stopSound();
    }

}


class SampleShelf {

    constructor( target ) {
        this.target = target;
        SampleShelf.instance = this;
        this.createShelf();
        this.samples = {};
    }

    createShelf() {
        let shelf = new Element('sample-shelf');
        this.target = shelf.appendToAndGetRef( this.target );
    }

    saveSample( sample ) {
        this.samples[ sample.getSampleId() ] = sample;
    }

    removeSample( sample ) {
        delete this.samples[ sample.getSampleId() ];
    }

}


class Sample {

    constructor( sourceName, data, infos, sampleShelf ) {
        this.data = data;
        this.infos = infos;
        this.sampleShelf = sampleShelf;
        this.shelf = SampleShelf.instance.target;
        this.lengthNameLimit = 14;
        this.isAKeySample = false;

        this.testName(sourceName);

        this.itsASampleInfo();
        this.initInstances();

        this.makeSample();
    }

    itsASampleInfo() {
        this.infos.isASample = true;
    }

    initInstances() {
        Sample.instances = typeof(Sample.instances)==='undefined' ? {} : Sample.instances;
        this.saveInstance();
    }

    saveInstance() {
        let nb = ++Object.keys(Sample.instances).length;
        this.nthSample = nb.toString().padStart('2', '0');

        Sample.instances[ this.getSampleId() ] = this;
    }

    static getInstanceById( id ) {
        if ( Sample.instances[ id ] instanceof Sample ) return Sample.instances[ id ];
        return 'No sample was found.';
    }

    testName(sourceName) {
        this.sourceName = sourceName;
        this.getFileExtension();
        this.nameLengthTest();
        this.testAllNameCharacters();
    }

    getFileExtension() {
        this.extensionFile = this.sourceName.slice(-3);
        this.displayName = this.sourceName.slice( 0, this.sourceName.length - 4 );
    }

    nameLengthTest() {
        this.displayName = this.displayName.length > this.lengthNameLimit ? this.displayName.slice( 0, this.lengthNameLimit ) + '...' : this.displayName;
    }

    testAllNameCharacters() {
        let output = [];
        for ( let i=0 ; i<this.displayName.length ; i++ ) {
            let newChar = this.testAValidCharacter( this.displayName[i] );
            if ( newChar ) output.push( newChar );
        }
        this.displayName = output.join('');
    }

    testAValidCharacter(char) {
        var regex = /[a-zA-Z0-9áàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ._\s\.\,\--]/;
        return char.match( regex );
    }

    getFullName() {
        return this.displayName + '.' + this.extensionFile + '_' + this.nthSample;
    }

    getSampleId() {
        return this.displayName.replace(/\s+/g, '') + '_' + this.nthSample;
    }

    remove() {
        this.wrapSample.remove();
    }

    moveTo( key ) {
        this.isAKeySample = true;
        this.remove();
        this.makeKeySample( key.div );
        this.sampleShelf.removeSample( this );
        key.setSample( this );
    }

    makeSample() {
        let sampleWrap = new Element('sample-wrap-' + this.nthSample);
        let sampleTitle = new Element('sample-title', this.getFullName() );
        let sampleCurve = new Element('sample-curve', false, 'canvas');
        let sampleHandle = this.prepareDraggable();

        let sampleZone = new Element('sample-zone');

        sampleWrap.element.classList.add('sample-wrap');
        sampleWrap.element.append(sampleTitle.element);

        this.wrapSample = sampleWrap.appendToAndGetRef( this.shelf );
        this.sampleZone = sampleZone.appendToAndGetRef( this.wrapSample );
        this.sampleCurve = sampleCurve.appendToAndGetRef( this.wrapSample );
        this.sampleHandle = sampleHandle.appendToAndGetRef( this.wrapSample );

        this.updateVisualizationInfos( 90, 140 );
    }

    makeKeySample( target ) {
        let sampleWrap = new Element('sample-wrap-' + this.nthSample);
        let sampleCurve = new Element('sample-curve', false, 'canvas');

        let sampleZone = new Element('sample-zone');

        sampleWrap.element.classList.add('sample-key-wrap');

        this.wrapSample = sampleWrap.appendToAndGetRef( target );
        this.sampleZone = sampleZone.appendToAndGetRef( this.wrapSample );
        this.sampleCurve = sampleCurve.appendToAndGetRef( this.wrapSample );

        this.updateVisualizationInfos( 45, 70 );
    }

    prepareDraggable() {
        let handle = new Element('sample-handle');
        handle.get().setAttribute('draggable', true);
        handle.get().setAttribute('ondragstart', 'onDragStart(event)' );
        handle.get().setAttribute('data-sampleid', this.getSampleId() );
        return handle;
    }

    updateVisualizationInfos( height, width ) {
        this.infos.canvasTarget = this.sampleCurve;
        this.infos.canvasHeight = height;
        this.infos.canvasWidth = width;

        this.prepareSoundData();
    }

    prepareSoundData() {
        this.soundData = new GetSoundData( this.data, this.displayName, this.infos );
        this.soundVisualization = this.soundData.soundVisualization;

        this.prepareActions();
    }

    prepareActions() {
        this.sampleActions = new SampleActions( this.soundVisualization, this.soundData, this.wrapSample, this.isAKeySample );
    }

}


class KeyPad {

    constructor( target ) {
        this.target = target;
        this.make();
        this.makeAllKeys();
        this.mapping = {};
    }

    make() {
        let keypad = new Element('keypad');
        this.div = keypad.appendToAndGetRef( this.target );
    }

    makeAllKeys() {
        let nbOfKeys = 10;

        for( let i=1 ; i<nbOfKeys ; i++ ) {
            new Key( i, this );
        }
    }

    setMappedKey( key ) {
        this.mapping[ key.name ] = key.sample;
    }

}


class Key {

    constructor( name, parentKeyPad ) {
        this.name = name;
        this.parentKeyPad = parentKeyPad;
        this.target = this.parentKeyPad.div;
        this.dropFunction = 'onDrop(event)';
        this.dragOverFunction = 'onDragOver(event)';
        this.initInstances();
        this.make();
    }

    getId() {
        return 'key' + this.name;
    }

    initInstances() {
        Key.instances = Key.instances ? Key.instances : {};
        this.saveInstance();
    }

    saveInstance() {
        Key.instances[ this.getId() ] = this;
    }

    static getById( id ) {
        return Key.instances[ id ];
    }

    make() {
        let dropZone = new Element('key' );

        dropZone.get().setAttribute('onDrop', this.dropFunction );
        dropZone.get().setAttribute('onDragOver', this.dragOverFunction );
        dropZone.get().setAttribute('data-key-name', this.name );
        dropZone.get().setAttribute('data-key-id', this.getId() );
        dropZone.get().classList.add( this.getId() );

        dropZone.appendToAndGetRef( this.target );
        this.div = this.target.querySelector( '.' + this.getId() );
        this.events();
    }

    events() {
        let keyCode = this.getKeyCode();

        window.addEventListener('keydown', (e)=>{
            if ( e.keyCode === keyCode ) {
                this.action();
            }
        });
    }

    action() {
        this.pressKey();

        if ( this.sample ) {
            let isPlaying = this.sample.sampleActions.readingHead.div;

            if ( isPlaying ) {
                this.sample.sampleActions.readingHead.stop();
            }
            this.sample.sampleActions.readingHead.start();
        }
    }

    pressKey() {
        this.endAnimation();
        window.setTimeout( ()=>{
            this.div.classList.add('press-key');
        }, 1);
    }

    endAnimation() {
        this.div.classList.remove('press-key');
    }

    getKeyCode() {
        return parseInt(this.name) + 96;
    }

    setSample( sample ) {
        this.sample = sample;
        this.parentKeyPad.setMappedKey( this );
    }

}


class SamplerSettingsPanel {

    constructor( trackId, panelManager ) {
        this.trackId = trackId;
        this.panelManager = panelManager;
        this.saveInstance();
        this.make();
    }

    static init() {
        SamplerSettingsPanel.instances = SamplerSettingsPanel.instances ? SamplerSettingsPanel.instances : {};
    }

    saveInstance() {
        SamplerSettingsPanel.instances [ this.trackId ] = this;
    }

    static getById( trackId ) {
        if ( !SamplerSettingsPanel.instances[ trackId ] ) return false;
        return SamplerSettingsPanel.instances[ trackId ];
    }

    static new ( trackId, panelManager ) {
        SamplerSettingsPanel.init();
        if ( SamplerSettingsPanel.getById( trackId ) ) {
            let instance = SamplerSettingsPanel.getById( trackId );
            instance.remake();
            return instance;
        };

        return new SamplerSettingsPanel( trackId, panelManager );
    }

    make() {
        //TODO Savoir quand créer de zéro (la première fois)
        // et quand réutiliser shelf, etc. et récupérer les instances.
        // (Fonction test).
        this.makeWrap();
        this.makeClose();
        this.keyPad = new KeyPad( this.contentWrap );
        this.sampleShelf = new SampleShelf( this.contentWrap );
        this.aSoundLoading = new SoundLoading( this.sampleShelf, this.contentWrap );
        this.events();
        this.on();
    }

    remake() {
        let settings = this.getSettings();
        //TODO Faire la recréation des éléments.
        // Repartir de zéro, ça veut dire recréer toutes les références de shelf, etc..
        // Elles sont disséminées un peu partout.
        // Pour l'instant : On met à jour empty pour la garder le plus de divs possibles.
        // On n'a pas à recréer les refs.
        // Il faut reprendre le train en marche avec soundVizualisation et lui repasser les refs.
    }

    makeWrap() {
        let samplerSettingsPanel = new Element('sampler-settings-panel');
        this.div = samplerSettingsPanel.appendToAndGetRef( global.body );

        let samplerSettingsTitle = new Element('sampler-settings-title', this.trackId + ' -- Settings' );
        this.titleDiv = samplerSettingsTitle.appendToAndGetRef( this.div );

        let contentWrap = new Element('sampler-settings-content');
        this.contentWrap = contentWrap.appendToAndGetRef( this.div );
    }

    makeClose() {
        let close = new Element('sampler-settings-close');
        this.closeDiv = close.appendToAndGetRef( this.contentWrap );
    }

    events() {
        this.closeDiv.addEventListener('click', (e)=>{
            this.toClose();
        });
    }

    toClose() {
        this.panelManager.quitSamplerSettingsPanel();
    }

    off() {
        this.div.classList.add('hidePanel');
        this.empty();
    }

    on() {
        this.div.classList.add('showPanel');
    }

    empty() {
        this.div.remove();
        //TODO Garder le plus de composants possibles (shelf, etc...)
    }

    getSettings() {
        return {
            loadingSound : this.aSoundLoading.soundData,
            shelfSamples : this.sampleShelf.samples,
            keypadSamples : this.keyPad.mapping
        };
    }

}


class TrackPanel {

    constructor( panelsManager ) {
        this.panelsManager = panelsManager;
        this.make();
    }

    make() {
        let trackPanel = new Element('track-panel');
        this.div = trackPanel.appendToAndGetRef( global.body );

        let trackInterface = new Element('track-interface');
        this.interface = trackInterface.appendToAndGetRef( this.div );

        let trackWrap = new Element('track-wrap');
        this.trackWrap = trackWrap.appendToAndGetRef( this.div );

        this.makeButtons()
    }

    makeButtons() {
        new newSamplerTrackButton( this.interface, this.trackWrap, this.panelsManager );
    }

    off() {
        this.div.classList.remove('showMainPanel');
        this.div.classList.add('hideMainPanel');
    }

    on() {
        this.div.classList.remove('hideMainPanel');
        this.div.classList.add('showMainPanel');
    }

}


class newSamplerTrackButton {

    constructor( target, trackWrap, panelsManager ) {
        this.target = target;
        this.trackWrap = trackWrap;
        this.panelsManager = panelsManager;
        this.make();
        this.events();
    }

    make() {
        let button = new Element('new-sampler-track-button');
        this.div = button.appendToAndGetRef( this.target );
    }

    events() {
        this.div.addEventListener('click', ()=>{
            this.clic();
        });
    }

    clic() {
        new SamplerTrack( this.trackWrap, this.panelsManager );
    }

}


class SamplerTrack {

    constructor( target, panelsManager ) {
        this.target = target;
        this.panelsManager = panelsManager;
        this.init();
        this.make();
    }

    init() {
        SamplerTrack.instances = SamplerTrack.instances ? SamplerTrack.instances : {};
        this.saveInstance();
    }

    getName() {
        let nth = ++Object.keys( SamplerTrack.instances ).length;
        this.name = 'sampler-track_' + nth.toString().padStart(0, 2);
        return this.name;
    }

    saveInstance() {
        SamplerTrack.instances[ this.getName() ] = this;
    }

    make() {
        let wrap = new Element(this.name);
        wrap.get().classList.add('sampler-track-wrap');
        this.div = wrap.appendToAndGetRef( this.target );

        let trackTitle = new Element('track-title', this.name);
        this.trackTitle = trackTitle.appendToAndGetRef( this.div );

        let interfaceWrap = new Element('sampler-track-interface');
        this.interfaceWrap = interfaceWrap.appendToAndGetRef( this.div );

        this.makeButtons();
        this.events();
    }

    makeButtons() {
        let settingsButton = new Element('sample-track-settings-button');
        this.settingsButton = settingsButton.appendToAndGetRef( this.interfaceWrap );
    }

    events() {
        this.settingsButton.addEventListener('click', ()=>{
            this.panelsManager.makeSamplerSettingsPanel( this.name );
        });
    }

}


class PanelsManager {

    constructor() {
        this.makeTrackPanel();
    }

    makeTrackPanel() {
        this.trackPanel = new TrackPanel( this );
    }

    makeSamplerSettingsPanel( trackId ) {
        this.trackPanel.off();
        this.samplerSettingsPanel = SamplerSettingsPanel.new( trackId, this );
    }

    quitSamplerSettingsPanel() {
        this.samplerSettingsPanel.off();
        this.trackPanel.on();
    }

}


new PanelsManager();





// Drag and drop functions
// ----------------------------------------

    function onDragStart(e) {
        e.dataTransfer.dropEffect = 'move';
        e.dataTransfer.setData("text/plain", e.target.getAttribute('data-sampleid') );
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    function onDrop(e) {
        e.preventDefault();

        let keyId = e.target.getAttribute('data-key-id');
        let key = Key.getById( keyId );

        let sampleId = e.dataTransfer.getData("text/plain");
        let sample = Sample.getInstanceById( sampleId );
        sample.moveTo( key );
    }

// ----------------------------------------




