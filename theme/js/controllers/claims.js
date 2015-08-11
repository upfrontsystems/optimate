// controller for the Claim data from the server
myApp.controller('claimsController', ['$scope', '$http', 'globalServerURL',
    function($scope, $http, globalServerURL) {

        toggleMenu('claims');

        $scope.isDisabled = false;
        $scope.jsonclaims = [];
        $scope.claimList = [];
        $scope.valuationsList = []

        // loading the project list
        $scope.clearFilters = function() {
            $scope.filters = [];
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
                params: {'Project': $scope.filters.Project,
                        'Date': $scope.filters.Date}
            };
            $http(req).success(function(response) {
                $scope.jsonclaims = response;
                $scope.claimsLengthCheck();
                console.log("Claims loaded");
            });
        }
        $scope.loadClaimSection();

        // load the list of valuations based on a project
        $scope.loadProjectValuations = function(projectid) {
            if (projectid) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'valuations',
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

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'claims_report_filter'
            };
            $http(req).success(function(response) {
                $scope.claimReportProjectsList = response['projects'];
                console.log("Claim report filter options loaded")
            })
        };

        $scope.getReport = function (report) {
            if ( report == 'claims' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'claims_report',
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

    }
]);
