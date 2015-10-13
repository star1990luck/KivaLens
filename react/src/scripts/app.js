'use strict'

require('linqjs')
require('datejs')
import React from 'react'
import Router from 'react-router'
import {Route, Redirect, IndexRoute} from 'react-router';
import {KLNav, KLFooter, Search, Loan, Basket, Options, About, Details, Schedule, Criteria, NotFound} from "./components";
import KivaAPI from './api/kiva'

KivaAPI.setAPIOptions({app_id: 'org.kiva.kivalens', max_concurrent: 8})

//turns var a = [1,2,3,4,5,6,7,8,9,10,11]; a.chunk(5); into => [[1,2,3,4,5],[6,7,8,9,10],[11]]
//added for taking arrays of loan ids and breaking them into the max kiva allows for a request
Array.prototype.chunk = function(chunkSize) {
    var R = [];
    for (var i=0; i<this.length; i+=chunkSize)
        R.push(this.slice(i,i+chunkSize));
    return R;
}

//not the best name... but i need this for all kiva dates
Date.from_iso = (s) => { return new Date(Date.parse(s)) }

class App extends React.Component {
    render(){
        return <div>
                <KLNav/>
                    {this.props.children}
                <KLFooter/>
            </div>
    }
} //

//When Page read, mount it.
document.addEventListener("DOMContentLoaded", function(event) {
    $(document).ready(function() {
        $.ajaxSetup({ cache: false });
    });

    if (document.getElementById("body")){
        React.render((<Router>
            <Route component={App} path="/">
                <Route path="search" component={Search}>
                    <Route path="loan/:id" component={Loan}>
                        <IndexRoute component={Details}/>
                        <Route path="schedule" component={Schedule}/>
                    </Route>
                    <IndexRoute component={Criteria}/>
                </Route>
                <Route path="basket" component={Basket}/>
                <Route path="options" component={Options}/>
                <Route path="about" component={About}/>
                <Redirect from="" to="/search"/>
                <Route path="*" component={NotFound}/>
            </Route>
        </Router>), document.getElementById("body"))
    }
});