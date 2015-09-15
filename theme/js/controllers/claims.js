// controller for the Claim data from the server
myApp.controller('claimsController', ['$scope', '$http', 'globalServerURL', 'SessionService',
    function($scope, $http, globalServerURL, SessionService) {

        toggleMenu('claims');

        $scope.isDisabled = false;
        $scope.jsonclaims = [];
        $scope.claimList = [];
        $scope.valuationsList = [];
        $scope.statusList = ['Draft', 'Claimed'];

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
            $scope.date = date;
        };

        // clear the filters and load the project list
        $scope.clearFilters = function() {
            $scope.filters = {};
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.clearFilters();

        $scope.claimsLengthCheck = function() {
            if ($scope.jsonclaims.length == 0) {
               $scope.claimsReportEnabled = false;
            }
            else {
               $scope.claimsReportEnabled = true;
            }
        }

        $scope.loadClaimSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'claims',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                $scope.jsonclaims = response;
                $scope.claimsLengthCheck();
                console.log("Claims loaded");
            });
        }
        $scope.loadClaimSection();

        // filter the other filter options by selection
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'claims/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.projectsList = response['projects'];
                    }
                }
                else {
                    $scope.projectsList = response['projects'];
                }
            })
        };

        // load the list of valuations based on a project
        $scope.loadProjectValuations = function(projectid) {
            if (projectid) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'claim/valuations',
                    params: {'Project': projectid}
                };
                $http(req).success(function(response) {
                    $scope.valuationsList = response;
                    console.log("Valuations list loaded")
                });
            }
            else {
                $scope.valuationsList = [];
            }
        }

        // Adding or editing a claim
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'claim' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the claim in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'claim'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'claim/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new claim to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'claim'};
                    });
                }
            }
        };

        // add a new claim to the list and sort
        $scope.handleNew = function(newclaim) {
            $scope.jsonclaims.push(newclaim);
            // sort by claim id
            $scope.jsonclaims.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.claimsLengthCheck();
            console.log ("Claim added");
        }

        // handle editing an claim
        $scope.handleEdited = function(editedclaim) {
            // search for the claim and edit in the list
            var result = $.grep($scope.jsonclaims, function(e) {
                return e.id == editedclaim.id;
            });
            var i = $scope.jsonclaims.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonclaims[i] = editedclaim;
            }
            console.log ("Claim edited");
        };

        // Set the selected claim and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedClaim = obj;
            $('#claim-'+obj.id).addClass('active').siblings().removeClass('active');
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'claim'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.valuationsList = [];
            $scope.dateTimeNow();
            $scope.formData['Date'] = $scope.date;
            if ($scope.selectedClaim) {
                $('#claim-'+$scope.selectedClaim.id).removeClass('active');
                $scope.selectedClaim = undefined;
            }
            $scope.saveClaimModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'claim/' + $scope.selectedClaim.id + '/'
            }).success(function(response) {
                $scope.loadProjectValuations(response.ProjectID);
                $scope.formData = response;
                $scope.formData.Date = new Date($scope.formData.Date);
                $scope.formData.NodeType = 'claim';
            });
            // set each field dirty
            angular.forEach($scope.saveClaimModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a claim and remove from the list
        $scope.deleteClaim = function() {
            var deleteid = $scope.selectedClaim.id;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'claim' + '/' + deleteid + '/'
            }).success(function () {
                var result = $.grep($scope.jsonclaims, function(e) {
                    return e.id == deleteid;
                });
                var i = $scope.jsonclaims.indexOf(result[0]);
                if (i>-1) {
                    $scope.jsonclaims.splice(i, 1);
                    $scope.claimsLengthCheck();
                    $scope.selectedClaim = undefined;
                    console.log("Deleted claim");
                }
            });
        };

        // process a claim
        $scope.toggleClaimStatus = function(status, index){
            $http({
                method: 'POST',
                url: globalServerURL + 'claim/' + $scope.selectedClaim.ID + '/status',
                data: {'status':status}
            }).success(function(){
                $scope.selectedClaim.Status = status;
                console.log("Claim " + $scope.selectedClaim.ID + " status to " + status);
            })
        }

        $scope.getReport = function (report) {
            if ( report == 'claim' ) {
                var claimid = $scope.selectedClaim.ID;
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'claim_report/' + claimid + '/',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
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
                    console.log("Claim pdf download error")
                });
            }
        };

        $scope.getExcelReport = function (report) {
            if ( report == 'claim' ) {
                var claimid = $scope.selectedClaim.ID;
                var target = document.getElementsByClassName('excel_download');
                var spinner = new Spinner().spin(target[0]);
                $http({
                    method: 'POST',
                    url: globalServerURL + 'excel_claim_report/' + claimid + '/',
                    data: $scope.formData},
                    {responseType: 'arraybuffer'})
                .success(function (response, status, headers, config) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    var file = new Blob([response], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.shee'});
                    var fileURL = URL.createObjectURL(file);
                    var result = document.getElementsByClassName("excel_hidden_download");
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
                    console.log("Claim excel download error")
                });
            }
        };

    }
]);
