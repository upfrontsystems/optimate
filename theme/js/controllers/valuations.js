// controller for the Valuation data from the server
myApp.controller('valuationsController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService', '$q',
    function($scope, $http, globalServerURL, $timeout, SessionService, $q) {

        toggleMenu('valuations');

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })

        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            return date;
        };
        $scope.isDisabled = false;
        $scope.jsonvaluations = [];
        $scope.budgetgroupList = [];
        $scope.modalForm = [];
        // Pagination variables and functions
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.valuationListLength = $scope.maxPageSize + 1;

        // get the length of the list of all the valuations
        $http.get(globalServerURL + 'valuations/length').success(function(data) {
            $scope.valuationListLength = data['length'];
        });

        $http.get(globalServerURL + 'projects/')
        .success(function(data) {
            $scope.projectsList = data;
        });

        $scope.loadValuationSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations',
                params: {'start': start,
                        'end': end}
            };
            $http(req).success(function(response) {
                $scope.jsonvaluations = response;
                console.log("Valuations loaded");
            });
        }
        $scope.loadValuationSection();

        // load the budgetgroups in the project
        // when the budgetgroups are loaded, load the project markups
        $scope.loadBudgetGroups = function() {
            $http.get(globalServerURL + 'node/' + $scope.formData['ProjectID'] + '/budgetgroups/'
            ).success(function(bgresponse) {
                $scope.loadMarkup().then(function(overheadsList){
                    $scope.overheadsList = overheadsList;
                    $scope.budgetgroupList = bgresponse;
                });
                console.log("Items loaded");
            });
        }

        $scope.loadMarkup = function(){
            var deferred = $q.defer();
            $http({method: 'GET',
                    url: globalServerURL + $scope.formData['ProjectID'] + '/overheads/',
                    params: {'NodeType': 'Project'}
            }).success(function(oresponse){
                // convert the overhead data to fit in the slickgrid
                overheadsList = [];
                for (var i in oresponse){
                    var slickdata = {'id': oresponse[i].ID,
                                    'ID': oresponse[i].ID,
                                    'Name': oresponse[i].Name,
                                    'PercentageComplete': oresponse[i].Percentage,
                                    'NodeType': 'Markup'}
                    overheadsList.push(slickdata);
                }
                deferred.resolve(overheadsList);
            });
            return deferred.promise;
        };

        // Adding or editing a valuation
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // set the list of budgetgroups
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + $scope.formData['NodeType'] + '/' + $scope.formData['ID'] + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the valuation in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + $scope.formData['NodeType'] + '/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new valuation to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': $scope.formData['NodeType']};
                    });
                }
            }
        };

        // add a new valuation to the list and sort
        $scope.handleNew = function(newvaluation) {
            // the new valuation is added to the beginning of the list
            $scope.jsonvaluations.unshift(newvaluation);
            console.log ("Valuation added");
        }

        // handle editing a valuation
        $scope.handleEdited = function(editedvaluation) {
            // search for the valuation and edit in the list
            var result = $.grep($scope.jsonvaluations, function(e) {
                return e.ID == editedvaluation.ID;
            });
            var i = $scope.jsonvaluations.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonvaluations[i] = editedvaluation;
            }
            console.log ("Valuation edited");
        };

        // Set the selected valuation and change the css
        $scope.showActionsFor = function(obj) {
            if ($scope.selectedValuation){
                $scope.selectedValuation.selected = undefined;
            }
            $scope.selectedValuation = obj;
            $scope.selectedValuation.selected = true;
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'valuation',
                                'ID': 0};
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.rowsSelected = {'selected': false,
                                    'expanded': false};
            $scope.formData['Date'] = $scope.dateTimeNow();
            $scope.budgetgroupList = [];
            if ($scope.selectedValuation) {
                $scope.selectedValuation.selected = undefined;
                $scope.selectedValuation = undefined;
            }
            $scope.saveValuationModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $scope.rowsSelected = {'selected': false,
                                    'expanded': false};
            $http({
                method: 'GET',
                url: globalServerURL + 'valuation/' + $scope.selectedValuation.ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'valuation';
                $scope.loadMarkup().then(function(overheadsList){
                    $scope.overheadsList = overheadsList;
                    $scope.budgetgroupList = $scope.formData['BudgetGroupList'];
                });
            });
            // set each field dirty
            angular.forEach($scope.saveValuationModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a valuation and remove from the valuations list
        $scope.deleteValuation = function() {
            var deleteid = $scope.selectedValuation.ID;
            $scope.selectedValuation = undefined;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonvaluations, function(e) {
                    return e.ID == deleteid;
                });
                var i = $scope.jsonvaluations.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonvaluations.splice(i, 1);
                    console.log("Deleted valuation");
                }
            });
        };

        $scope.toggleRowsSelected = function(rowsselected, expanded) {
            $timeout(function() {
                $scope.rowsSelected.selected = rowsselected;
                $scope.rowsSelected.expanded = expanded;
            });
        }

        $scope.expandBudgetGroupsGrid = function() {
            var selectedRows = $scope.getSelectedNodes();
            $scope.clearSelectedRows();
            $scope.iterateOverRows(selectedRows, 0)
        };

        // need to recursively call the http post,
        // otherwise it reaches the end of the list before it has finished loading
        $scope.iterateOverRows = function(rows, index){
            $http({
                method: 'POST',
                url:globalServerURL + 'expand_budgetgroup/' + rows[index].ID
            }).success(function (response) {
                // get the index of the current node
                var start = $scope.budgetgroupList.map(function(e) {
                    return e.ID; }).indexOf(rows[index].ID);
                $scope.budgetgroupList.splice(start, 1);
                // insert the children, and the updated parent, in the list
                Array.prototype.splice.apply($scope.budgetgroupList,
                                            [start, 0].concat(response));
                $scope.selectRow(start);
                // on the last loop reload the slickgrid and node
                if (index == rows.length-1) {
                    // on the last loop reload the slickgrid and node
                    // $scope.setSelectedRows();
                    $scope.toggleRowsSelected(true, true);
                    $scope.handleReloadValuationSlickgrid();
                }
                else{
                    index+=1;
                    $scope.iterateOverRows(rows, index);
                }
            });
        }

        $scope.collapseBudgetGroupsGrid = function() {
            var selectedRows = $scope.getSelectedNodes()
            $scope.clearSelectedRows();
            for (var i in selectedRows){
                // find the index if the selected row in the budget group list
                var start = $scope.budgetgroupList.map(function(e) {
                    return e.ID; }).indexOf(selectedRows[i].ID);
                // find the count of children the expanded budget group has
                var count = 1;
                while ((start + count) < $scope.budgetgroupList.length
                        && selectedRows[i].ID == $scope.budgetgroupList[start + count].ParentID){
                    count+=1;
                }
                // update the parent percentage and expanded flag
                var percentage = '0';
                var bgtotal = 0
                if (start < (start + count-1)){
                    // set the budget group total as the sum of the children
                    for (var c = start+1; c < (start+count); c++){
                        bgtotal += parseFloat($scope.budgetgroupList[c]['TotalBudget']);
                    }
                    if (bgtotal > 0){
                        percentage = 100.0*parseFloat(
                            $scope.budgetgroupList[start]['AmountComplete'])/bgtotal;
                    }
                }
                $scope.budgetgroupList[start]['TotalBudget'] = bgtotal;
                $scope.budgetgroupList[start]['PercentageComplete'] = percentage;
                $scope.budgetgroupList[start]['expanded'] = false;
                // splice the elements out of the array
                $scope.budgetgroupList.splice(start+1, count-1);
                $scope.selectRow(start);
            }
            $scope.toggleRowsSelected(true, false);
            $scope.handleReloadValuationSlickgrid();
        };

        $scope.getReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'valuation_report/' + $scope.selectedValuation.ID + '/'},
                    {responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/pdf'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("pdf_hidden_download");
                    var anchor = angular.element(result);
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    anchor.attr({
                        href: fileURL,
                        target: '_blank',
                        download: filename
                    })[0].click();
                    // clear the anchor so that everytime a new report is linked
                    anchor.attr({
                        href: '',
                        target: '',
                        download: ''
                    });
                }).error(function(data, status, headers, config) {
                    console.log("Valuation pdf download error")
                });
            }
        };

    }
]);
