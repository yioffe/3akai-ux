/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

/*global $, Config, sdata, History, Widgets */

var sakai = sakai || {};
sakai.search = function() {


    //////////////////////////
    //    Config variables    //
    //////////////////////////

    var resultsToDisplay = 12;
    var searchterm = "";
    var currentpage = 0;
    var foundPeople = [];
    var contactclicked = false;
    var mainSearch = false;


    //    CSS IDs


    var search = "#search";

    var searchConfig = {
        search : "#search",
        global : {
            resultTemp : search + "_result_temp",
            button : search + "_button",
            text  :search + '_text',
            numberFound : search + '_numberFound',
            searchTerm : search + "_mysearchterm",
            searchBarSelectedClass : "search_bar_selected",
            pagerClass : ".jq_pager",
            messageClass : ".search_result_person_link_message",
            messageID : "search_result_person_link_message_",
            addToContactsLink : ".link_add_to_contacts",
            addToContactsDialog : '#add_to_contacts_dialog',
            sendmessageContainer : "#sendmessagecontainer"
        },
        addFriend : {
            types : '#add_friend_types',
            typesList : 'add_friends_list_type',
            typesTemplate : "add_friend_types_template",
            displayNameClass : ".add_friend_displayname",
            profilePicture : "#add_friend_profilepicture",
            personalNote : "#add_friend_personal_note",
            personalNoteTemplate : "add_friend_personal_note_template",
            doInvite : "#add_friends_do_invite",
            form : "#add_friends_form",
            response: "#add_to_contacts_response",
            addToContacts : "#link_add_to_contacts_{USERID}",
            addToContactsDivider : "#link_add_to_contacts_{USERID}_divider",
            errors : {
                request : "#add_to_contacts_error_request",
                message : "#add_to_contacts_error_message",
                noTypeSelected : "#add_to_contacts_error_noTypeSelected"
            }

        },
        filters : {
            filter : search + "_filter",
            sites : {
                filterSites : search + "_filter_my_sites",
                filterSitesTemplate : "search_filter_my_sites_template",
                ids : {
                    entireCommunity : '#search_filter_community',
                    allMySites : '#search_filter_all_my_sites',
                    specificSite : '#search_filter_my_sites_'
                },
                values : {
                    entireCommunity :'entire_community',
                    allMySites : "all_my_sites"
                }
            }
        },
        tabs : {
            all : "#tab_search_all",
            content : "#tab_search_content",
            people : "#tab_search_people",
            sites : "#tab_search_sites"
        },
        results : {
            container : search + '_results_container',
            header : search + '_results_header',
            template : 'search_results_template'
        }
    };




    //////////////////
    //    functions    //
    //////////////////


    /**
     * This method will show all the appropriate elements for when a search is executed.
     */
    var showSearchContent = function() {
        $(searchConfig.global.searchTerm).text(searchterm);
        $(searchConfig.global.numberFound).text("0");
        $(searchConfig.results.header).show();
        $(searchConfig.results.container).html($(searchConfig.global.resultTemp).html());
    };

    /**
     * This method will cretae a flat space separeted
     * string from a numbered object. For example: obj = {0:"Foo",1:"Bar"} will return "Foo Bar"
     * @param {Object} input_object
     * @return {String} The concatenated String
     */
    var concatObjectValues = function(input_object) {

        var return_string = "";

        // Error handling
        if ((input_object.length === 0) || (!input_object)) {
            return return_string;
        }

        // Concatenate
        for (var i = 0, j = input_object.length; i<j; i++) {
            return_string += input_object[i]+" ";
        }

        // Remove extra space at the end
        return_string = return_string.substring(0,return_string.length-1);

        return return_string;
    };


    /**
     * Will search for a user in the list of results we got from the server.
     * @param {String} userid
     * @return Will return the user object if something is found, false if nothing is found.
     */
    var searchPerson = function(userid) {
        var person = false;
        for (var i = 0, j = foundPeople.length; i<j; i++) {
            if (foundPeople[i].userid === userid) {
                person = foundPeople[i];
                break;
            }
        }
        return person;
    };



    //////////////////////////////
    //    Search functionality    //
    //////////////////////////////


    /**
     * Used to do a search. This will add the page and the searchterm to the url and add
     * it too the history without reloading the page. This way the user can navigate
     * using the back and forward button.
     * @param {Integer} page The page you are on (optional / default = 1.)
     * @param {String} searchquery The searchterm you want to look for (optional / default = input box value.)
     */
    var doHSearch = function(page, searchquery, searchwhere) {
        if (!page) {
            page = 1;
        }
        if (!searchquery) {
            searchquery = $(searchConfig.global.text).val().toLowerCase();
        }
        if (!searchwhere) {
            searchwhere = mainSearch.getSearchWhereSites();
        }
        currentpage = page;
        //    This will invoke the sakai._search.doSearch function and change the url.
        History.addBEvent(page, encodeURIComponent(searchquery), searchwhere);
    };

    /**
     * When the pager gets clicked.
     * @param {integer} pageclickednumber The page you want to go to.
     */
    var pager_click_handler = function(pageclickednumber) {
        currentpage = pageclickednumber;
        //    Redo the search
        doHSearch(currentpage, searchterm);
    };

    /**
     * This will render all the results we have found.
     * @param {Object} results The json object containing all the result info.
     * @param {Boolean} success If the request was succesfull or not
     */
    var renderResults = function(results, success) {
        var finaljson = {};
        finaljson.items = [];
        if (success) {

            // Adjust display global total
            // If number is higher than a configurable threshold show a word instead conveying ther uncountable volume -- TO DO: i18n this
            if ((results.total <= sakai.config.Search.MAX_CORRECT_SEARCH_RESULT_COUNT) && (results.total >= 0)) {
                $(searchConfig.global.numberFound).text(""+results.total);
            } else if (results.results.length <= 0) {
                $(searchConfig.global.numberFound).text(0);
            } else {
                $(searchConfig.global.numberFound).text("thousands");
            }

            // Reset the pager.
            $(searchConfig.global.pagerClass).pager({
                pagenumber: currentpage,
                pagecount: Math.ceil(results.total / resultsToDisplay),
                buttonClickCallback: pager_click_handler
            });

            if (results.results) {
                finaljson = mainSearch.preparePeopleForRender(results.results, finaljson);
            }

            // If we don't have any results or they are less then the number we should display
            // we hide the pager
            if ((results.total < resultsToDisplay) || (results.results.length <= 0)) {
                $(searchConfig.global.pagerClass).hide();
                $("#create_site_these_people").hide();
            }
            else {
                $(searchConfig.global.pagerClass).show();
                $("#create_site_these_people").show();
            }

        }
        else {
            $(searchConfig.global.pagerClass).hide();
        }
        foundPeople = finaljson.items;
        //    Render the results.
        $(searchConfig.results.container).html($.TemplateRenderer(searchConfig.results.template, finaljson));
        $("#search_results_page1").show();
    };



    //////////////////////////
    //    _search functions    //
    //////////////////////////

    /*
     * These are functions that are defined in search_history.js .
     * We override these with our owm implementation.
     */


    /**
     * This function gets called everytime the page loads and a new searchterm is entered.
     * It gets called by search_history.js
     * @param {Integer} page The page you are on.
     * @param {String} searchquery The searchterm you want to search trough.
     * @param {string} searchwhere The subset of contact you want to search in.
     *  * = entire community
     *  my contacts = the site the user is registered on
     */
    sakai._search.doSearch = function(page, searchquery, searchwhere) {

        currentpage = parseInt(page,  10);

        //    Set all the input fields and paging correct.
        mainSearch.fillInElements(page, searchquery, searchwhere);


        //    Get the search term out of the input box.
        //    If we were redirected to this page it will be added previously already.
        searchterm = $(searchConfig.global.text).val().toLowerCase();

        //    Rebind everything
        mainSearch.addEventListeners(searchterm, searchwhere);

        if (searchterm) {
            // Show and hide the correct elements.
            showSearchContent();

            // Set off the AJAX request

            // Look to in which place we are searching (is it all the contacts or only my contacts)
            var searchWhere = mainSearch.getSearchWhereUsers();

            // What are we looking for?
            var urlsearchterm = mainSearch.prepSearchTermForURL(searchterm);

            // The search URL depends on the searchWhere variable
            var searchURL;
            
            if(searchWhere === "mycontacts") {
                searchURL = sakai.config.URL.SEARCH_USERS_ACCEPTED + urlsearchterm;
            }  else {
                searchURL = sakai.config.URL.SEARCH_USERS + "?page=" + (currentpage - 1) + "&items=" + resultsToDisplay + "&username=" + urlsearchterm + "&s=sakai:firstName&s=sakai:lastName";
            }

            $.ajax({
                cache: false,
                url: searchURL,
                success: function(data) {

                    // Store found people in data cache
                    sakai.data.search.results_people = {};
                    for (var i = 0, j = data.results.length; i < j; i++) {
                        sakai.data.search.results_people[data.results[i]["rep:userId"]] = data.results[i];
                    }

                    renderResults(data, true);
                },
                error: function(xhr, textStatus, thrownError) {
                    sakai.data.search.results_people = {};
                    renderResults(sakai.data.search.results_people, false);
                }
            });

        }
        else {
            sakai._search.reset();
        }
    };

    /**
     * Will reset the view to standard.
     */
    sakai._search.reset = function() {
        $(searchConfig.results.header).hide();
    };


    ///////////////////////////////////
    // Create site with found people //
    ///////////////////////////////////

    $("#create_site_these_people_link").bind("click", function(ev){
        var searchterm = $(searchConfig.global.text).val().toLowerCase();
        var urlsearchterm = mainSearch.prepSearchTermForURL(searchterm);
        var url = sakai.config.URL.SEARCH_USERS + "?page=" + 0 + "&items=" + results.total + "&username=" + urlsearchterm;
        $.ajax({
            cache: false,
            url: url,
            success: function(data) {
                var finaljson = {};
                finaljson.items = [];
                finaljson = mainSearch.preparePeopleForRender(data.results, finaljson);
                sakai.createsite.initialise(finaljson);
            },
            error: function(xhr, textStatus, thrownError) {
                alert(sakai.api.i18n.Widgets.getValueForKey("__MSG__AN_ERROR_HAS_OCCURED__"));
            }
        });
    });



    //////////////////////
    //    Event binding    //
    //////////////////////


    /** When a user wants to message another  user */
    $(searchConfig.global.messageClass).live("click", function() {
        var reg = new RegExp(searchConfig.global.messageID, "gi");
        var contactclicked = $(this).attr("id").replace(reg,"");
        var person = searchPerson(contactclicked);
        if (contactclicked) {
            $(searchConfig.global.sendmessageContainer).show();
            if (!person.uuid) {
                person.uuid = person.userid;
            }
            if (!person.hasOwnProperty("firstName") && !person.hasOwnProperty("lastName")) {
                person.firstName = person.uuid;
                person.lastName = "";
            }
            sakai.sendmessage.initialise(person, true);
        }
    });

    /** A user want to make a new friend. */
    $(searchConfig.global.addToContactsLink).live("click", function(ev) {
        contactclicked = this.id.split("_")[4];
        sakai.addtocontacts.initialise(contactclicked, mainSearch.removeAddContactLinks);
    });


    //////////////////////
    //    init function    //
    //////////////////////


    var thisFunctionality = {
        "doHSearch" : doHSearch
    };


    /**
     * Will fetch the sites and add a new item to the history list.
     */
    var doInit = function() {
        mainSearch = sakai._search(searchConfig, thisFunctionality);
        //    Make sure that we are still logged in.
        if (mainSearch.isLoggedIn()) {
            //    Get my friends
            mainSearch.fetchMyFriends();
            //    add the bindings
            mainSearch.addEventListeners();
        }
    };
    doInit();
};

sakai.api.Widgets.Container.registerForLoad("sakai.search");
