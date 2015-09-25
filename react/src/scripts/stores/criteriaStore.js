'use strict';
import Reflux from 'reflux'
import {criteriaActions, loanActions} from '../actions'

var criteriaStore = Reflux.createStore({
    listenables: [criteriaActions],
    last_known:{},
    init:function(){
        //console.log("criteriaStore:init")
        //load from local storage.
    },
    onChange: function(criteria){
        //console.log("criteriaStore:onChange", criteria)
        this.last_known = criteria
        loanActions.filter(criteria)
    },
    onGetLast: function(){
        //console.log("criteriaStore:onGetLast")
        criteriaActions.getLast.completed(this.last_known)
        criteriaActions.change(this.last_known)
    },
    syncGetLast: function(){
        return this.last_known
    }
})

export {criteriaStore}