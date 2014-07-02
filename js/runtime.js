/* 
 Created on : 11.05.2014, 12:45:15
 Author     : danielkuenkel
 Mail       : daniel.kuenkel@informatik.hs-fulda.de
 */

var INITIALIZATION = "initialisation";
var POSES = "poses";
var MOTION = "motion";
var STANDARD = "standard";

var SIMULATION_OFF = "simulationOff";
var SIMULATION_ON = "simulationOn";

var recognitionState = INITIALIZATION;
var simulationState = SIMULATION_OFF;

var recognizeGestures = true;
var screenLocked = false;

var controller;

var ANESTHESIA_START = "anesthesiaStart";
var INTUBATION = "intubation";
var RELEASE_ANESTHESIA = "releaseAnesthesia";

var CIRCLE_CW = "circleCW";
var CIRCLE_CCW = "circleCCW";
var SWIPE_L_TO_R = "swipeLToR";
var SWIPE_R_TO_L = "swipeRToL";
var SCREEN_TAP = "screenTap";
var KEY_TAP = "keyTap";

var anesthesiaGestures = new Array(ANESTHESIA_START, INTUBATION, RELEASE_ANESTHESIA);
var standardGestures = new Array(CIRCLE_CW, CIRCLE_CCW, SWIPE_L_TO_R, SWIPE_R_TO_L, SCREEN_TAP, KEY_TAP);

var gestureNames = new Array(9);

gestureNames[0] = new Array(2);
gestureNames[0][0] = ANESTHESIA_START;
gestureNames[0][1] = "<b>Anästhesiebeginn</b>";
gestureNames[0][2] = "audio-startAnesthesia";

gestureNames[1] = new Array(2);
gestureNames[1][0] = INTUBATION;
gestureNames[1][1] = "<b>Intubation</b>";
gestureNames[1][2] = "audio-intubation";

gestureNames[2] = new Array(2);
gestureNames[2][0] = RELEASE_ANESTHESIA;
gestureNames[2][1] = "<b>Freigabe Anästhesie</b>";
gestureNames[2][2] = "audio-releaseAnaesthesie";

gestureNames[3] = new Array(2);
gestureNames[3][0] = CIRCLE_CW;
gestureNames[3][1] = "Clockwise <b>Circle</b>";

gestureNames[4] = new Array(2);
gestureNames[4][0] = CIRCLE_CCW;
gestureNames[4][1] = "Counter clockwise <b>Circle</b>";

gestureNames[5] = new Array(2);
gestureNames[5][0] = SWIPE_L_TO_R;
gestureNames[5][1] = "<b>Swipe</b> left to right";

gestureNames[6] = new Array(2);
gestureNames[6][0] = SWIPE_R_TO_L;
gestureNames[6][1] = "<b>Swipe</b> right to left";

gestureNames[7] = new Array(2);
gestureNames[7][0] = SCREEN_TAP;
gestureNames[7][1] = "<b>Screen Tap</b>";

gestureNames[8] = new Array(2);
gestureNames[8][0] = KEY_TAP;
gestureNames[8][1] = "<b>Key Tap</b>";

var deviceConnected = false;
var simulationTimeout;
var startSimulationTime;
var timesArray;
var countdownTime = 6;
var countdownTimer;


function onPageLoaded() {
    showWelcomeScreen();
}

function onDeviceNotReady() {
    resetContent();

    var image = document.createElement('img');
    image.src = "img/leapConnect.png";
    image.id = "leapFront";
    document.getElementById('contentFrame').appendChild(image);

    var statusText = document.createElement("div");
    statusText.class = "statusText";
    statusText.innerHTML = "<b>Waiting for a leap device.</b>";
    document.getElementById('contentFrame').appendChild(statusText);
}

function onWebSocketConnected() {
    onDeviceNotReady();
}

function onWebSocketDisconnected() {
    document.getElementById('contentFrame').innerHTML = "WebSockets disconnected.";

    if (simulationState === SIMULATION_ON)
    {
        screenLocked = false;
        clearTimeout(simulationTimeout);
    }
}

function onDeviceConnected() {
    if (recognitionState !== INITIALIZATION)
    {
        deviceConnected = true;

        resetContent();

        var image = document.createElement('img');
        image.src = "img/leapFront.png";
        image.id = "leapFront";
        document.getElementById('contentFrame').appendChild(image);

        var statusText = document.createElement("div");
        statusText.class = "statusText";
        statusText.innerHTML = "<b>Ready for gestures.</b>";
        document.getElementById('contentFrame').appendChild(statusText);

        if (simulationState === SIMULATION_ON) {
            showInitialSimulationText();
        }
    }
    else
    {
        showWelcomeScreen();
    }
}

function onDeviceDisconnected() {
    if (recognitionState !== INITIALIZATION)
    {
        deviceConnected = false;

        resetContent();

        var image = document.createElement('img');
        image.src = "img/leapConnect.png";
        image.id = "leapUp";
        document.getElementById('contentFrame').appendChild(image);

        var statusText = document.createElement('div');
        statusText.appendChild(document.createTextNode("A Leap device has been disconnected."));
        document.getElementById('contentFrame').appendChild(statusText);
    }
    if (simulationState === SIMULATION_ON)
    {
        screenLocked = false;
        clearTimeout(simulationTimeout);
    }
}

function resetContent() {
    document.getElementById('contentFrame').innerHTML = "";
}

function onDeviceFrame(frame) {
    for (var i = 0; i < frame.gestures.length; i++) {
        if (recognizeGestures) {
            var gesture = frame.gestures[0];
            var type = gesture.type;

            switch (type) {
                case "circle":
                    onCircle(gesture);
                    break;
                case "swipe":
                    onSwipe(gesture);
                    break;
                case "screenTap":
                    onScreenTap(gesture);
                    break;
                case "keyTap":
                    onKeyTap(gesture);
                    break;
            }
        }
    }
}


function onCircle(gesture) {
    var r = gesture.radius;
    var circleType = CIRCLE_CCW;

    if (gesture.normal[2] <= 0) {
        circleType = CIRCLE_CW;
    }

    if (simulationState === SIMULATION_ON) {
        handleSimulationGesture(circleType);
    } else {
        tweenGestureText(findGestureName(circleType), 0, false);
    }
}


function onSwipe(gesture) {
    var startPos = gesture.startPosition;
    var pos = gesture.position;
    var minGestureDistance = 200;
    var swipeType = null;

    if (startPos[0] > pos[0] && startPos[0] - pos[0] > minGestureDistance) {
        swipeType = SWIPE_R_TO_L;
    }
    else if (startPos[0] < pos[0] && pos[0] - startPos[0] > minGestureDistance) {
        swipeType = SWIPE_L_TO_R;
    }

    if (swipeType)
    {
        if (simulationState === SIMULATION_ON) {
            handleSimulationGesture(swipeType);
        } else {
            tweenGestureText(findGestureName(swipeType), 0, false);
        }
    }
}

function onScreenTap(gesture) {
    if (simulationState === SIMULATION_ON) {
        handleSimulationGesture(SCREEN_TAP);
    } else {
        tweenGestureText(findGestureName(SCREEN_TAP), 0, false);
    }
}

function onKeyTap(gesture) {
    if (simulationState === SIMULATION_ON) {
        handleSimulationGesture(KEY_TAP);
    } else {
        tweenGestureText(findGestureName(KEY_TAP), 0, false);
    }
}

function tweenGestureText(text, hit, showHit) {
    resetContent();

    var image = document.createElement('img');
    image.src = "img/leapFront.png";
    image.id = "leapFront";
    document.getElementById('contentFrame').appendChild(image);

    var statusText = document.createElement("div");
    statusText.class = "statusText";
    statusText.innerHTML = showHit ? text + ", " + (hit * 100) + "%" : text;
    document.getElementById('contentFrame').appendChild(statusText);

    TweenMax.to(statusText, 0.5, {delay: 0.1, scale: 5, autoAlpha: 0, ease: Cubic.easeIn});
}

function playSound(soundId) {
    var sound = document.getElementById(soundId);
    sound.play();
}


function onPosesClick() {
    if (recognitionState !== POSES)
    {
        simulationCount = 0;

        recognitionState = POSES;
        $('#buttonStandard').removeClass('sel');
        $('#buttonMotion').removeClass('sel');
        $('#buttonPosen').addClass('sel');

        controller = new Leap.Controller({enableGestures: false});
        var trainer = new LeapTrainer.Controller({controller: controller, minPoseFrames: 15, downtime: 100, hitThreshold: 0.8});

        trainer.fromJSON('{"name":"anesthesiaStart","pose":true,"data":[[{"x":0.09380231171102119,"y":-0.13117157218138206,"z":0.3472222222222222,"stroke":1},{"x":0.08254603430569865,"y":-0.1154309835196163,"z":0.3055555555555556,"stroke":1},{"x":-0.17634834601671986,"y":0.24660255570099834,"z":-0.6527777777777778,"stroke":1}],[{"x":0.08996293987072615,"y":-0.13571540428782095,"z":0.3472222222222222,"stroke":1},{"x":0.07916738708623902,"y":-0.11942955577328236,"z":0.3055555555555556,"stroke":1},{"x":-0.1691303269569652,"y":0.2551449600611033,"z":-0.6527777777777778,"stroke":1}],[{"x":0.08786394099846631,"y":-0.05685244384969316,"z":0.3472222222222222,"stroke":1},{"x":0.07732026807865036,"y":-0.05003015058772988,"z":0.30555555555555547,"stroke":1},{"x":-0.16518420907711664,"y":0.10688259443742304,"z":-0.6527777777777778,"stroke":1}],[{"x":0.0912820396379139,"y":-0.02197328115066091,"z":0.3472222222222222,"stroke":1},{"x":0.0803281948813642,"y":-0.019336487412581715,"z":0.30555555555555547,"stroke":1},{"x":-0.17161023451927812,"y":0.04130976856324263,"z":-0.6527777777777778,"stroke":1}],[{"x":0.09550370311181255,"y":-0.009863311975309276,"z":0.3472222222222222,"stroke":1},{"x":0.08404325873839497,"y":-0.008679714538272048,"z":0.3055555555555556,"stroke":1},{"x":-0.17954696185020746,"y":0.018543026513581327,"z":-0.6527777777777778,"stroke":1}]]}');
        trainer.fromJSON('{"name":"intubation","pose":true,"data":[[{"x":0.1648159990258552,"y":-0.05446854749944851,"z":0.11260185081133375,"stroke":1},{"x":0.2329631998051711,"y":-0.04155884775189338,"z":0.03907000330268304,"stroke":1},{"x":0.3011104005844868,"y":-0.02864914800433847,"z":-0.03446184420596762,"stroke":1},{"x":-0.6988895994155132,"y":0.12467654325568034,"z":-0.11721000990804914,"stroke":1}],[{"x":0.16064911850815378,"y":-0.06224627309116321,"z":0.13830218148098444,"stroke":1},{"x":0.2321298237016307,"y":-0.061479573184545055,"z":0.05478517582299103,"stroke":1},{"x":0.30361052889510776,"y":-0.06071287327792691,"z":-0.02873182983500236,"stroke":1},{"x":-0.6963894711048922,"y":0.18443871955363517,"z":-0.16435552746897303,"stroke":1}],[{"x":0.14994428552935235,"y":-0.04456140470874748,"z":0.14908710964173705,"stroke":1},{"x":0.22998885710587047,"y":-0.03405645455493765,"z":0.07473910460409411,"stroke":1},{"x":0.3100334286823886,"y":-0.023551504401127826,"z":0.0003910995664512251,"stroke":1},{"x":-0.6899665713176114,"y":0.10216936366481297,"z":-0.22421731381228238,"stroke":1}],[{"x":0.156801736299662,"y":-0.040149570885149,"z":0.13463453048145085,"stroke":1},{"x":0.2313603472599325,"y":-0.02852145013734575,"z":0.06178434919264569,"stroke":1},{"x":0.3059189582202029,"y":-0.0168933293895425,"z":-0.011065832096159467,"stroke":1},{"x":-0.6940810417797971,"y":0.08556435041203725,"z":-0.18535304757793702,"stroke":1}],[{"x":0.15919378704510512,"y":-0.03700663406013714,"z":0.12803211854964713,"stroke":1},{"x":0.23183875740902105,"y":-0.022572943870184086,"z":0.055178272096338576,"stroke":1},{"x":0.304483727772937,"y":-0.00813925368023103,"z":-0.01767557435697001,"stroke":1},{"x":-0.695516272227063,"y":0.06771883161055225,"z":-0.16553481628901567,"stroke":1}]]}');
        trainer.fromJSON('{"name":"releaseAnesthesia","pose":true,"data":[[{"x":0.3472222222222222,"y":0.018480167804799837,"z":0.09114851030540352,"stroke":1},{"x":0.30555555555555547,"y":0.01626254766822379,"z":0.08021068906875509,"stroke":1},{"x":-0.6527777777777778,"y":-0.03474271547302362,"z":-0.17135919937415858,"stroke":1}],[{"x":0.3472222222222222,"y":0.011674897151086733,"z":0.12130007208370105,"stroke":1},{"x":0.30555555555555547,"y":0.010273909492956205,"z":0.10674406343365697,"stroke":1},{"x":-0.6527777777777778,"y":-0.021948806644042935,"z":-0.228044135517358,"stroke":1}],[{"x":0.3472222222222222,"y":0.017381099010895303,"z":0.17079278083370553,"stroke":1},{"x":0.30555555555555547,"y":0.015295367129587914,"z":0.1502976471336609,"stroke":1},{"x":-0.6527777777777778,"y":-0.032676466140483224,"z":-0.3210904279673665,"stroke":1}],[{"x":0.3472222222222222,"y":0.0335297160263727,"z":0.08277504263680868,"stroke":1},{"x":0.30555555555555547,"y":0.029506150103207937,"z":0.07284203752039167,"stroke":1},{"x":-0.6527777777777778,"y":-0.06303586612958062,"z":-0.1556170801572004,"stroke":1}],[{"x":0.3472222222222222,"y":-0.018204352004941436,"z":0.08507855494053465,"stroke":1},{"x":0.30555555555555547,"y":-0.01601982976434854,"z":0.07486912834767054,"stroke":1},{"x":-0.6527777777777778,"y":0.03422418176928998,"z":-0.1599476832882052,"stroke":1}]]}');

        initializeStandardCallbacks();

        trainer.on('gesture-recognized', function(hit, gestureName) {
            if (recognizeGestures && hit > 0.93) {
                if (simulationState === SIMULATION_ON)
                {
                    handleSimulationGesture(gestureName);
                }
                else
                {
                    tweenGestureText(findGestureName(gestureName), hit, true);
                }
            }
        });

        trainer.on('gesture-unknown', function(bestHit, closestGestureName) {
            if (recognizeGestures) {
                //tweenGestureText("Unknown gesture found");
            }
        });

        controller.connect();
    }
}

function onMotionClick() {
    if (recognitionState !== MOTION)
    {
        recognitionState = MOTION;
        $('#buttonStandard').removeClass('sel');
        $('#buttonMotion').addClass('sel');
        $('#buttonPosen').removeClass('sel');
    }
}

function onStandardClick() {
    if (recognitionState !== STANDARD)
    {
        simulationCount = 0;
        recognitionState = STANDARD;
        $('#buttonStandard').addClass('sel');
        $('#buttonMotion').removeClass('sel');
        $('#buttonPosen').removeClass('sel');

        controller = new Leap.Controller({enableGestures: true});

        controller.on("frame", function(frame) {
            onDeviceFrame(frame);
        });

        initializeStandardCallbacks();
    }
}

function onSimulationToggleClick() {
    switch (simulationState) {
        case SIMULATION_OFF:
            initializeSimulationState();
            break;
        case SIMULATION_ON:
            disposeSimulationState();
            break;
    }
}

function onInfoClick() {
    recognizeGestures = false;
    TweenMax.to($('#infoFrame'), 0.3, {autoAlpha: 1});
    TweenMax.to($('#buttonInfo'), 0.3, {autoAlpha: 0});
    $('#contentFrame').addClass('blured');
    $('#footer').addClass('blured');
}

function onCloseInfoClick() {
    recognizeGestures = true;
    TweenMax.to($('#infoFrame'), 0.3, {autoAlpha: 0});
    TweenMax.to($('#buttonInfo'), 0.3, {autoAlpha: 1});
    $('#contentFrame').removeClass('blured');
    $('#footer').removeClass('blured');
}

function showWelcomeScreen() {
    var statusText = document.createElement("div");
    statusText.class = "statusText";
    statusText.innerHTML = "Please select a gesture recognition type in the footer. <br/> Anesthesia <b>poses</b> or the Leap Motion &#8482 <b>standard gestures.</b>";
    document.getElementById('contentFrame').appendChild(statusText);
}

function initializeStandardCallbacks() {
    controller.on('connect', function() {
        onWebSocketConnected();
    });
    controller.on('disconnect', function() {
        onWebSocketDisconnected();
    });
    controller.on('deviceStreaming', function() {
        onDeviceConnected();
    });
    controller.on('deviceStopped', function() {
        onDeviceDisconnected();
    });
    controller.on('deviceAttached', function() {
        onDeviceConnected();
    });

    controller.connect();
}

function initializeSimulationState() {
    simulationState = SIMULATION_ON;
    $('#buttonSimulation').addClass('sel');
    simulationCount = 0;
    showInitialSimulationText();
}

function showInitialSimulationText() {
    switch (recognitionState) {
        case STANDARD:
            gestureArray = standardGestures;
            gestureArray = shuffleArray(standardGestures);
            timesArray = new Array(gestureArray.length);
            break;
        case POSES:
            gestureArray = anesthesiaGestures;
            timesArray = new Array(gestureArray.length);
            break;
        default:
            resetContent();

            var statusText = document.createElement("div");
            statusText.class = "statusText";
            statusText.innerHTML = "Please select a gesture recognition type. <br/> Anesthesia <b>poses</b> or the Leap Motion &#8482 <b>standard gestures.</b>";
            document.getElementById('contentFrame').appendChild(statusText);
            break;
    }

    if (!deviceConnected) {
        onDeviceDisconnected();
    }
    else if (deviceConnected && recognitionState !== INITIALIZATION) {
        showCurrentSearchedGesture();
    }
}

function showCurrentSearchedGesture() {
    resetContent();

    clearTimeout(countdownTimer);
    clearTimeout(simulationTimeout);
    screenLocked = false;
    startSimulationTime = new Date();

    var image = document.createElement('img');
    image.src = "img/gesture-" + gestureArray[simulationCount] + ".png";
    image.id = "leapFront";
    document.getElementById('contentFrame').appendChild(image);

    var statusText = document.createElement("div");
    statusText.class = "statusText";
    statusText.innerHTML = "<br>Please make the " + findGestureName(gestureArray[simulationCount]) + " gesture.";
    document.getElementById('contentFrame').appendChild(statusText);
}

function disposeSimulationState() {
    simulationState = SIMULATION_OFF;
    $('#buttonSimulation').removeClass('sel');

    if (deviceConnected) {
        onDeviceConnected();
    }
}

function handleSimulationGesture(gestureName) {
    if (!screenLocked && gestureArray[simulationCount] === gestureName) {
        screenLocked = true;

        var recognitionTime = ((new Date() - startSimulationTime) / 1000).toFixed(1);
        timesArray[simulationCount] = recognitionTime;

        if (recognitionState === POSES) {
            playSound(gestureNames[findGestureId(gestureName)][2]);
        }

        resetContent();

        var image = document.createElement('img');
        image.src = "img/okay.png";
        image.id = "leapFront";
        document.getElementById('contentFrame').appendChild(image);

        var statusText = document.createElement("div");
        statusText.class = "statusText";
        statusText.innerHTML = "<br/>Detected <b>" + findGestureName(gestureName) + "</b> gesture in <b>" + recognitionTime + "</b> seconds.";
        document.getElementById('contentFrame').appendChild(statusText);

        simulationTimeout = setTimeout('unlockSimulationScreen()', countdownTime * 1000);

        if (simulationCount < gestureArray.length-1)
        {
            countdown(countdownTime);
        }
        else
        {
            var finishText = document.createElement("div");
            finishText.class = "statusText";
            finishText.innerHTML = "<br/><b>All gestures detected. One moment please!</b>";
            document.getElementById('contentFrame').appendChild(finishText);
        }

        simulationCount++;
    }
}

function unlockSimulationScreen() {
    screenLocked = false;
    clearTimeout(simulationTimeout);

    if (simulationCount < gestureArray.length) {
        showCurrentSearchedGesture();
    }
    else
    {
        disposeSimulationState();

        resetContent();

        for (var i = 0; i < timesArray.length; i++) {
            var timeText = document.createElement("div");
            timeText.class = "statusText";
            timeText.innerHTML = findGestureName(gestureArray[i]) + ": " + timesArray[i];
            document.getElementById('contentFrame').appendChild(timeText);
        }

        var statusText = document.createElement("div");
        statusText.class = "statusText";
        statusText.innerHTML = "<br>Detect all gestures. <b>Simulation done</b>. <br/>Switched to normal detection mode.<br/><b>Ready for gestures.</b>";
        document.getElementById('contentFrame').appendChild(statusText);
    }
}

function countdown(i) {
    if (i > 0) {
        var counterText = document.getElementById("counterText");

        if (counterText)
        {
            if (i === 1) {
                counterText.innerHTML = "Next gesture in " + i + " second ...";
            }
            else
            {
                counterText.innerHTML = "Next gesture in " + i + " seconds ...";
            }
        } else {
            var counterText = document.createElement("div");
            counterText.class = "statusText";
            counterText.id = "counterText";
            counterText.innerHTML = "Next gesture in " + i + " seconds ...";
            document.getElementById('contentFrame').appendChild(counterText);
        }

        i--;
        countdownTimer = setTimeout("countdown(" + i + ")", 1000);
    }
}

function findGestureName(searchedGesture) {
    for (var i = 0; i < gestureNames.length; i++) {
        if (gestureNames[i][0] === searchedGesture) {
            return gestureNames[i][1];
        }
    }
}

function findGestureId(searchedGesture)
{
    for (var i = 0; i < gestureNames.length; i++) {
        if (gestureNames[i][0] === searchedGesture) {
            return i;
        }
    }
}

function shuffleArray(array){ //v1.0
    for(var j, x, i = array.length; i; j = Math.floor(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
    return array;
};