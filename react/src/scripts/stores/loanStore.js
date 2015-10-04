'use strict';
import Reflux from 'reflux'
import LoanAPI from '../api/loans'
import a from '../actions'
import criteriaStore from './criteriaStore'

//array of api loan objects that are sorted in the order they were returned.
var loans_from_kiva = [];
var loanStore = Reflux.createStore({
    listenables: [a.loans],
    init:function(){
        console.log("loanStore:init")
        a.loans.load();
    },
    onLoad: function(options) {
        console.log("loanStore:onLoad")

        //we already have the loans, just spit them back.
        if (loans_from_kiva.length > 0){
            a.loans.load.completed(loans_from_kiva);
            return;
        }

        $.extend(options, {})

        //options.region = 'af'
        LoanAPI.getAllLoans(options)
            .done(loans => {
                //local_this.loans = loans;
                window.kiva_loans = loans
                loans_from_kiva = loans;
                a.loans.load.completed(loans)
            })
            .progress(progress => {
                console.log("progress:", progress)
                a.loans.load.progressed(progress)
            })
            .fail(() =>{
                a.loans.load.failed()
            })
    },

    onDetail: function(id){
        a.loans.detail.completed(this.syncGet(id))
    },

    onFilter: function(c){
        //console.log("loanStore:onFilter:",c)
        a.loans.filter.completed(this.syncFilterLoans(c))
    },

    syncHasLoadedLoans: function(){
        return loans_from_kiva.length > 0
    },

    mergeLoan: function(d_loan){
        var loan = loans_from_kiva.first(loan => { return loan.id == d_loan.id })
        if (loan)
            $.extend(loan, d_loan)
    },

    syncGet: function(id){
        return loans_from_kiva.first(loan => {return loan.id == id})
    },

    syncFilterLoans: function(c){
        if (!c){
            c = criteriaStore.syncGetLast()
        }
        //break this into another unit --store? LoansAPI.filter(loans, criteria)
        var loans = loans_from_kiva

        //for each search term for sector, break it into an array, ignoring spaces and commas
        //for each loan, test the sector against each search term.

        var makeSearchTester = function(text){
            var result =  (text && text.length > 0) ? text.match(/(\w+)/g).distinct().select(word => { return word.toUpperCase() }) : []
            console.log('makeSearchTester',result)
            return {
                startsWith: function(loan_attr){
                    return result.length == 0 ? true : result.any( search_text => { return sStartsWith(loan_attr, search_text) } )
                },
                contains: function(loan_attr){
                    return result.length == 0 ? true : result.any( search_text => { return loan_attr.toUpperCase().indexOf(search_text) > -1 } )
                },
                terms_arr: result}
        }

        var sStartsWith = function(loan_attr, test){
            return (test) ? loan_attr.toUpperCase().startsWith(test) : true
        }

        var stSector = makeSearchTester(c.sector)
        var stActivity = makeSearchTester(c.activity)
        var stName = makeSearchTester(c.name)
        var stCountry = makeSearchTester(c.country)
        var stUse = makeSearchTester(c.use)

        loans = loans.where(loan => {
            return stSector.startsWith(loan.sector) &&
                stActivity.startsWith(loan.activity) &&
                stName.contains(loan.name) &&
                stCountry.startsWith(loan.location.country) &&
                stUse.terms_arr.all(search_term => { return loan.kl_use_or_descr_arr.any(w => { return w.startsWith(search_term) } ) } )
        })

        console.log('criteria', c)
        return loans
    }

    /**onSingle: (id)=>{
        LoanAPI.getLoan(id)
            .done((result)=>{
                this.trigger(result);
            })
    },

    onSearch: (options)=>{
        LoanAPI.getLoans(options)
            .done((result)=>{
                this.trigger(result)
            })
    },

    onBatch: (id_arr)=>{
        LoanAPI.getLoanBatch(id_arr)
            .done((result)=>{
                this.trigger(result);
            })
    }**/
});

export default loanStore