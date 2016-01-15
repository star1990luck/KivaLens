'use strict'

class lsj { //localStorage JSON
    static get(key, default_result = {}){
        return $.extend(true, {}, default_result, JSON.parse(localStorage.getItem(key)))
    }
    static getA(key, default_result = []){
        return JSON.parse(localStorage.getItem(key)) || default_result
    }
    static set(key, value){
        localStorage.setItem(key, JSON.stringify(value))
    }
    static setMerge(key, newStuff){
        lsj.set(key,$.extend(true, {}, lsj.get(key), newStuff))
    }
}
window.lsj = lsj

window.perf = function(func){ //need separate for async
    var t0 = performance.now();
    func();
    var t1 = performance.now();
    console.log("Call took " + (t1 - t0) + " milliseconds.")
}

window.callKLAFeature = function(feature){
    var $d = $.Deferred()
    KLAFeatureCheck([feature]).done(opt => {
        if (opt[feature]) {
            var message = {}
            message[feature] = true
            chrome.runtime.sendMessage(KLA_Extension, message, reply => $d.resolve(reply))
        }
    })
    return $d
}

window.KLAdev  = 'egniipplnomjpdlhmmbpmdfbhemdioje'
window.KLAprod = 'jkljjpdljndblihlcoenjbmdakaomhgo'
window.KLA_Extension = window.location.hostname == 'localhost' ? KLAdev : KLAprod

window.getKLAFeatures = function(){
    //either returns the feature array or fails.
    var $d = $.Deferred()
    if (typeof chrome != "undefined") {
        chrome.runtime.sendMessage(KLA_Extension, {getFeatures:true},
            reply => {
                if (reply && reply.features) {
                    $d.resolve(reply.features)
                } else {
                    $d.reject()
                }
            })
    } else {
        $d.reject()
    }
    return $d
}

window.KLAFeatureCheck = function(featureArr){
    var $d = $.Deferred()

    var result = {}
    featureArr.forEach(feature => result[feature] = false)

    getKLAFeatures()
        .done(features => {
            featureArr.forEach(feature => {
                result[feature] = features.contains(feature)
            })
            $d.resolve(result)
        })
        .fail(()=>$d.resolve(result))

    return $d
}

window.KLAHasFeature = function(featureName) {
    var $d = $.Deferred()

    getKLAFeatures()
        .done(features => $d.resolve(features.contains(featureName)))
        .fail(()=>$d.resolve(false))

    return $d
}

window.setDebugging = function() {
    window.kl_debugging = lsj.get("Options").debugging
}

window.basicReverseOrder = function(a,b) { //this is a hack. OrderByDescending has issues! Not sure what the conditions are.
    if (a > b) return -1
    if (a < b) return 1
    return 0
}

setDebugging()

window.cl = function() {
    if (window.kl_debugging)
        console.trace(arguments)
}

//MORE LINQ GOODNESS
//this is a common enough pattern in KL that it makes sense to standardize and shorten.
Array.prototype.groupByWithCount = function(selector=e=>e){
    return this.groupBy(selector).select(g => ({name: selector(g[0]), count: g.length}))
}
//no longer used...
Array.prototype.groupBySelectWithTake = function(selector, take_count = 1){
    return this.groupBy(selector).select(g => ({name: selector(g[0]), taken: g.take(take_count)}))
}

Array.prototype.groupBySelectWithSum = function(selector, sumSelector){
    return this.groupBy(selector).select(g => ({name: selector(g[0]), sum: g.sum(sumSelector)}))
}

Array.prototype.percentWhere = function(predicate) {return this.where(predicate).length * 100 / this.length}

//flatten takes a multi dimensional array and flattens it [[1,2],[2,3,4]] => [1,2,2,3,4]
Array.prototype.flatten = function(){ return [].concat.apply([], this) }

//either count() or count(l=>l.status='fundraising') work
Array.prototype.count = function(predicate) {
    return typeof predicate == 'function'? this.where(predicate).length: this.length
}

//turns var a = [1,2,3,4,5,6,7,8,9,10,11]; a.chunk(5); into => [[1,2,3,4,5],[6,7,8,9,10],[11]]
//added for taking arrays of loan ids and breaking them into the max kiva allows for a request
//this now has a lodash equivalent... can remove this after conversion
Array.prototype.chunk = function(chunkSize) {
    var R = []
    for (var i=0; i<this.length; i+=chunkSize)
        R.push(this.slice(i,i+chunkSize))
    return R
}

//I hate this!
window.findBootstrapEnv = function() {
    var envs = ["xs", "sm", "md", "lg"],
        doc = window.document,
        temp = doc.createElement("div")

    doc.body.appendChild(temp)

    for (var i = envs.length - 1; i >= 0; i--) {
        var env = envs[i]

        temp.className = "hidden-" + env

        if (temp.offsetParent === null) {
            doc.body.removeChild(temp)
            return env
        }
    }
    return "";
}

//turns user_favorite => User Favorite
window.humanize = function (str) {
    var frags = str.split('_');
    for (var i=0; i<frags.length; i++) {
        frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
    }
    return frags.join(' ');
}

window.waitFor = function(test, interval = 200) {
    var $d = $.Deferred()
    if (test()) {
        $d.resolve()
    } else {
        var handle = setInterval(()=> {
            if (test()) {
                $d.resolve()
                clearInterval(handle)
            }
        }, interval)
    }
    return $d
}

window.wait = ms => {
    var $d = $.Deferred()
    setTimeout($d.resolve,ms)
    return $d
}