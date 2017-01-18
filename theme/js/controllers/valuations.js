// controller for the Valuation data from the server
myApp.controller('valuationsController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService', '$q', 'FileSaver',
    function($scope, $http, globalServerURL, $timeout, SessionService, $q, FileSaver) {

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
        $scope.selectedValuations = [];
        $scope.budgetgroupList = [];
        $scope.modalForm = [];
        $scope.statusList = [{'Status': 'Draft'}, {'Status': 'Paid'}];
        // Pagination variables
        $scope.pageSize = 100;
        $scope.currentPage = 1;
        $scope.maxPageSize = 20;
        $scope.valuationListLength = $scope.maxPageSize;

        // get the length of the list of all the valuations
        $http.get(globalServerURL + 'valuations/length').success(function(data) {
            $scope.valuationListLength = data['length'];
        });
        // get all the projects
        $http.get(globalServerURL + 'projects/')
        .success(function(data) {
            $scope.projectsList = data;
        });

        // clear the filters and load the project list
        $scope.clearFilters = function() {
            $scope.filters = {};
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.filteredProjectsList = data;
            });
        }
        $scope.filteredProjectsList = [];
        $scope.clearFilters();

        $scope.loadValuationSection = function() {
            var start = ($scope.currentPage-1)*$scope.pageSize;
            var end = start + $scope.pageSize;
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations',
                params: {'start': start,
                        'end': end,
                        'Project': $scope.filters.Project,
                        'Date': $scope.filters.Date,
                        'Status': $scope.filters.Status}
            };
            $http(req).success(function(response) {
                $scope.jsonvaluations = response['valuations'];
                if (response['length']){
                    $scope.valuationListLength = response['length'];
                }
                console.log("Valuations loaded");
            });
        }
        $scope.loadValuationSection();

        // filter the other filter options by selection
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'valuations/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.filteredProjectsList = response['projects'];
                    }
                }
                else {
                    $scope.filteredProjectsList = response['projects'];
                }
            })
        };

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
                    oresponse[i].PercentageComplete = 0;
                    oresponse[i].NodeType = 'ValuationMarkup';
                    oresponse[i].TotalBudget = oresponse[i].Amount;
                    overheadsList.push(oresponse[i]);
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
                $scope.formData['ValuationMarkups'] = $scope.getMarkupRows();
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
            // clear the item selection
            $scope.clearSelectedValuations();
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
                url: globalServerURL + 'valuation/' + $scope.selectedValuations[0].ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData['NodeType'] = 'valuation';
                $scope.overheadsList = $scope.formData['ValuationMarkups'];
                $scope.budgetgroupList = $scope.formData['BudgetGroupList'];
            });
            // set each field dirty
            angular.forEach($scope.saveValuationModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a valuation and remove from the valuations list
        $scope.deleteValuation = function(index) {
            var deleteid = $scope.selectedValuations[index].ID;
            $http({
                method: 'DELETE',
                url: globalServerURL + $scope.formData['NodeType'] + '/' + deleteid + '/'
            }).success(function () {
                console.log("Deleted valuation " + $scope.selectedValuations[index].ID);
                index+=1;
                if (index < $scope.selectedValuations.length){
                    $scope.deleteValuation(index);
                }
                else{
                    for (var i in $scope.selectedValuations){
                        var result = $.grep($scope.jsonvaluations, function(e) {
                            return e.ID == $scope.selectedValuations[i].ID;
                        });
                        var ind = $scope.jsonvaluations.indexOf(result[0]);
                        if (ind>-1) {
                            $scope.jsonvaluations[ind].selected = false;
                            $scope.jsonvaluations.splice(ind, 1);
                        }
                    }
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

        // set each item selected/unselected
        $scope.toggleAllCheckboxes = function(){
            var state = $scope.selectedValuations.length != $scope.jsonvaluations.length;
            for (var i in $scope.jsonvaluations){
                $scope.jsonvaluations[i].selected = state;
            }
        }

        // deselect all the selected orders
        $scope.clearSelectedValuations = function(){
            if ($scope.selectedValuations.length == $scope.jsonvaluations.length){
                $scope.toggleAllCheckboxes();
            }
            else{
                for (var i in $scope.selectedValuations){
                    var result = $.grep($scope.jsonvaluations, function(e) {
                        return e.ID == $scope.selectedValuations[i].ID;
                    });
                    var ind = $scope.jsonvaluations.indexOf(result[0]);
                    if (ind>-1) {
                        $scope.jsonvaluations[ind].selected = false;
                    }
                }
            }
        }

        $scope.getReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'valuation_report/' + $scope.selectedValuations[0].ID + '/',
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    var file = new Blob([response], {type: 'application/pdf'});
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: file,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Valuation pdf download error")
                }).finally(function(){
                    spinner.stop();
                });
            }
        };

        $scope.getExcelReport = function (report) {
            if ( report == 'valuation' ) {
                var target = document.getElementsByClassName('excel_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'excel_valuation_report/' + $scope.selectedValuations[0].ID + '/',
                    responseType: 'arraybuffer'
                }).success(function (response, status, headers, config) {
                    var blob = new Blob([response], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    var filename_header = headers('Content-Disposition');
                    var filename = filename_header.split('filename=')[1];
                    var config = {
                      data: blob,
                      filename: filename,
                    };

                    FileSaver.saveAs(config);
                }).error(function(data, status, headers, config) {
                    console.log("Valuation excel download error")
                }).finally(function(){
                    spinner.stop();
                });
            }
        };

    }
]);
