'use strict'

const isServer = require("./kivaBase").isServer
const extend = require('extend')
require('linqjs')
require('datejs')

var common_use = ["PURCHASE", "FOR", "AND", "BUY", "OTHER", "HER", "BUSINESS", "SELL", "MORE", "HIS", "THE", "PAY"]
var common_descr =  common_use.concat(["THIS", "ARE", "SHE", "THAT", "HAS", "LOAN", "BE", "OLD", "BEEN", "YEARS", "FROM", "WITH", "INCOME", "WILL", "HAVE"])

var ageRegEx1 = new RegExp(/([2-9]\d)[ |-]years?[ |-](?:of age|old)/i)
var ageRegEx2 = new RegExp(/(?:aged?|is) ([2-9]\d)/i) //reduce to a single regex?

const getAge = text => {
    var ageMatch = ageRegEx1.exec(text)
    ageMatch = ageMatch || ageRegEx2.exec(text)
    return (Array.isArray(ageMatch) && ageMatch.length == 2) ? parseInt(ageMatch[1]) : null
}


//also: age(d) 34, 50 years of age
//static class to hold standard functions that prepare kiva api objects for use with kiva lens.
//should be "transforms"
class ResultProcessors {
    static processLoans(loans){
        //this alters the loans in the array. no need to return the array ?
        loans.forEach(ResultProcessors.processLoan)
        return loans
    }

    static unprocessLoans(loans){
        return loans.select(ResultProcessors.unprocessLoan)
    }

    //remove any KivaLens-added fields/functions
    static unprocessLoan(loan){
        loan = extend(true, {}, loan) //make a copy, strip it out
        Object.keys(loan).where(f=>f.indexOf('kl_') == 0).forEach(field => delete loan[field])
        delete loan.getPartner
        return loan
    }

    static processLoanDescription(loan){
        var processText = function(text, ignore_words){
            if (text && text.length > 0){
                //remove common words.
                var matches = text.match(/(\w+)/g) //splits on word boundaries
                if (!Array.isArray(matches)) return []
                return matches.distinct() //ignores repeats
                    .where(word => (word != undefined) && (word.length > 2)) //ignores words 2 characters or less
                    .select(word => word.toUpperCase()) //UPPERCASE
                    .where(word => !ignore_words.contains(word) ) //ignores common words
            } else {
                return [] //no indexable words.
            }
        }

        /**
         * on the server, on the first-pass the kls will be empty, the description and use will be populated.
         * on the client, the kls will be populated but no description.
         */

        if (isServer()) {
            if (loan.description.texts.en) {
                var descr_arr = processText(loan.description.texts.en, common_descr)
            } else {
                descr_arr = []
            }
            var use_arr = processText(loan.use, common_use)
            loan.kls_has_descr = loan.description.texts.en != undefined
            loan.kls_use_or_descr_arr = use_arr.concat(descr_arr).distinct()
        } else {
            if (!loan.description.texts.en)
                loan.description.texts.en = loan.kls_has_descr ? "" : "No English description available."
        }

        if (!loan.kls_age) //skip if populated from server since the description will be empty.
            loan.kls_age = getAge(loan.description.texts.en)
    }
    static processLoan(loan){
        if (typeof loan != 'object') return //for an ids_only search... should never get called though!

        loan.kl_processed = new Date()
        loan.kl_name_arr = loan.name.toUpperCase().match(/(\w+)/g)
        loan.kl_posted_date = new Date(loan.posted_date)
        loan.kl_newest_sort = loan.kl_posted_date.getTime()
        loan.kl_posted_hours_ago = function(){ return  (new Date() - this.kl_posted_date) / (60*60*1000) }.bind(loan)
        if (!loan.basket_amount) loan.basket_amount = 0
        if (!loan.funded_amount) loan.funded_amount = 0
        loan.kl_dollars_per_hour = function(){ return (this.funded_amount + this.basket_amount) / this.kl_posted_hours_ago() }.bind(loan)
        loan.kl_still_needed = Math.max(loan.loan_amount - loan.funded_amount - loan.basket_amount,0) //api can spit back that more is basketed than remains...
        loan.kl_percent_funded = (100 * (loan.funded_amount + loan.basket_amount)) / loan.loan_amount
        if (loan.tags) //if tags present, always use those.
            loan.kls_tags = loan.tags.select(tag => tag.name) //standardize to just an array without a hash.
        if (!loan.kls_tags) loan.kls_tags = []

        if (!isServer()) {
            loan.getPartner = function () {
                //todo: this should not reference kivaloans...
                if (!this.kl_partner) this.kl_partner = kivaloans.getPartner(this.partner_id)
                return this.kl_partner
            }.bind(loan)
        }

        if (loan.kls) { // replace what was stripped out by the server before sending down.
            loan.description = loan.description || {languages:["en"],texts:{en:''}}
            loan.status = loan.status || 'fundraising'
            //this is clumsy... can't we just populate borrower_count and percent_female?
            loan.borrowers = Array.range(1,loan.klb.M || 0).select(x=>({gender:"M",first_name: '...'}))
            loan.borrowers = loan.borrowers.concat(Array.range(1,loan.klb.F || 0).select(x=>({gender:"F",first_name: '...'})))
            loan.borrower_count = loan.borrowers.length
            loan.kls_half_back = new Date(loan.kls_half_back)
            loan.kls_75_back = new Date(loan.kls_75_back)
            loan.kls_final_repayment = new Date(loan.kls_final_repayment)
            loan.kls = false
        }

        if (loan.description.texts) { //the presence implies this is a detail result; this doesn't run during the background refresh.
            ResultProcessors.processLoanDescription(loan)

            loan.kl_planned_expiration_date = new Date(loan.planned_expiration_date)
            loan.kl_expiring_in_days = function(){ return (this.kl_planned_expiration_date - today) / (24 * 60 * 60 * 1000) }.bind(loan)
            loan.kl_disbursal_in_days = function(){ return (new Date(loan.terms.disbursal_date) - today) / (24 * 60 * 60 * 1000) }.bind(loan)

            loan.kl_percent_women = loan.borrowers.percentWhere(b => b.gender == "F")

            ///REPAYMENT STUFF: START
            var amount_50 = loan.loan_amount  * 0.5
            var amount_75 = loan.loan_amount * 0.75
            var running_total = 0
            loan.kl_repayments = []

            //some very old loans do not have scheduled payments.
            if (loan.terms.scheduled_payments && loan.terms.scheduled_payments.length) {
                var today = Date.today()

                //replace Kiva's version since it has too many entries.
                if (!loan.kls)
                    loan.terms.scheduled_payments = loan.terms.scheduled_payments.groupBy(p=>p.due_date).select(g => ({due_date: g[0].due_date, amount: g.sum(p=>p.amount)}))

                //for some loans, kiva will spit out non-summarized data and give 4+ repayment records for the same day.
                var repayments = loan.terms.scheduled_payments.select(p => {
                    var date = new Date(p.due_date)
                    return {date: date, display: date.toString("MMM-yyyy"), amount: p.amount}
                })

                //fill in the gaps for southern-guy-toothy-shaped repayments.
                var nextDate = new Date(Math.min(Date.next().month().set({day: 1}).clearTime(), repayments.first().date)).clearTime()
                var lastDate = repayments.last().date.clearTime()
                while (nextDate <= lastDate) {
                    let displayToTest = nextDate.toString("MMM-yyyy")
                    let repayment = repayments.first(r => r.display == displayToTest)
                    if (!repayment) //new Date() because it needs to make a copy of the date object or they all hold a ref.
                        repayments.push({date: new Date(nextDate.getTime()), display: displayToTest, amount: 0})
                    nextDate = nextDate.next().month().set({day: 1}).clearTime() //clearTime() to correct for DST bs?
                }
                //remove the leading 0 payment months. ordering needed to get the newly added ones in their proper spot.
                loan.kl_repayments = repayments.orderBy(p=>p.date).skipWhile(p=>p.amount==0)

                //two fold purpose: added a running percentage for all the repayments and track when the payments hit 50 and 75%
                loan.kl_repayments.forEach(payment => {
                    //there's got to be a more accurate algorithm to handle this efficiently...
                    running_total += payment.amount
                    payment.percent = (running_total * 100) / loan.loan_amount
                    if (!loan.kls_half_back && running_total >= amount_50) {
                        loan.kls_half_back = payment.date
                        loan.kls_half_back_actual = (running_total * 100) / loan.loan_amount
                    }
                    if (!loan.kls_75_back && running_total >= amount_75) {
                        loan.kls_75_back = payment.date
                        loan.kls_75_back_actual = (running_total * 100) / loan.loan_amount
                    }
                })
                loan.kls_final_repayment =  loan.kl_repayments.last().date
                //when looking at really old loans, can be null
                loan.kl_repaid_in = loan.kls_final_repayment ? Math.abs((loan.kls_final_repayment.getFullYear() - today.getFullYear()) * 12 + (loan.kls_final_repayment.getMonth() - today.getMonth())) : 0

            }
            ///REPAYMENT STUFF: END

            //memory clean up, delete all non-english descriptions.
            loan.description.languages.where(lang => lang != 'en').forEach(lang => delete loan.description.texts[lang])
            delete loan.terms.local_payments //we don't care
            delete loan.terms.disbursal_currency
            delete loan.terms.disbursal_amount
            delete loan.terms.loan_amount

            //do memory clean up of larger pieces of the loan object.
            if (loan.borrowers) //only visible
                loan.borrowers.where(b=> b.last_name=='').forEach(b=> delete b.last_name)

        }
        //add kivalens specific fields to the loan.
        //extend(loan, addIt)

        delete loan.tags
        delete loan.journal_totals
        delete loan.translator
        delete loan.location.geo
        delete loan.location.town
        delete loan.image.template_id
        if (!loan.bonus_credit_eligibility) delete loan.bonus_credit_eligibility
        return loan
    }

    static processPartners(partners){
        var regions_lu = {"North America":"na","Central America":"ca","South America":"sa","Africa":"af","Asia":"as","Middle East":"me","Eastern Europe":"ee","Western Europe":"we","Antarctica":"an","Oceania":"oc"}
        partners.forEach(p => {
            p.kl_sp = p.social_performance_strengths ? p.social_performance_strengths.select(sp => sp.id) : []
            p.kl_regions = p.countries.select(c => regions_lu[c.region]).distinct()
            p.kl_years_on_kiva = (Date.today().getTime() - new Date(p.start_date).getTime()) / (365.25 * 24 * 60 * 60000) // in years.
        })
        return partners
    }
}

module.exports = ResultProcessors