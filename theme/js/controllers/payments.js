// controller for the Payment data from the server
myApp.controller('paymentsController', ['$scope', '$http', 'globalServerURL', 'SessionService',
    function($scope, $http, globalServerURL, SessionService) {

        toggleMenu('payments');

        $scope.isDisabled = false;
        $scope.jsonpayments = [];
        $scope.paymentList = [];
        $scope.claimsList = []
        $scope.selectedItems = [];

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })

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

        $scope.paymentsLengthCheck = function() {
            if ($scope.jsonpayments.length == 0) {
               $scope.paymentsReportEnabled = false;
            }
            else {
               $scope.paymentsReportEnabled = true;
            }
        }

        $scope.loadPaymentSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'payments',
                params: {'Project': $scope.filters.Project,
                        'Date': $scope.filters.Date}
            };
            $http(req).success(function(response) {
                $scope.jsonpayments = response;
                $scope.paymentsLengthCheck();
                console.log("Payments loaded");
            });
        }
        $scope.loadPaymentSection();

        // load the list of claims based on a project
        $scope.loadProjectClaims = function(projectid) {
            if (projectid) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'payment/claims',
                    params: {'Project': projectid}
                };
                $http(req).success(function(response) {
                    $scope.claimsList = response;
                    console.log("Claims list loaded");
                });
            }
            else {
                $scope.claimsList = [];
            }
        }

        // when a claim is selected update the default amount
        $scope.claimSelected = function(claimid){
            if (claimid){
                $http.get(globalServerURL + 'claim/' + claimid + '/'
                ).success(function(response){
                    $scope.formData.Amount = parseFloat(response['Total']);
                });
            }
        }

        // Adding or editing a payment
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'payment' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the payment in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'payment'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'payment/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new payment to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'payment'};
                    });
                }
            }
        };

        // add a new payment to the list and sort
        $scope.handleNew = function(newitem) {
            $scope.jsonpayments.push(newitem);
            // sort by id
            $scope.jsonpayments.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.paymentsLengthCheck();
            console.log ("Payment added");
        }

        // handle editing an payment
        $scope.handleEdited = function(editeditem) {
            // search for the payment and edit in the list
            var result = $.grep($scope.jsonpayments, function(e) {
                return e.id == editeditem.id;
            });
            var i = $scope.jsonpayments.indexOf(result[0]);
            if (i>-1) {
                $scope.jsonpayments[i] = editeditem;
            }
            console.log ("Payment edited");
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'payment'};
            var d = new Date();
            $scope.formData.Date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.claimsList = [];
            // clear the item selection
            $scope.clearSelectedItems();
            $scope.savePaymentModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'payment/' + $scope.selectedItems[0].ID + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData.Date = new Date($scope.formData.Date);
                $scope.formData.NodeType = 'payment';
                $scope.formData.Amount = response['Amount'];
            });
            // set each field dirty
            angular.forEach($scope.savePaymentModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete a payment and remove from the list
        $scope.deletePayment = function(index) {
            var deleteid = $scope.selectedItems[0].ID;
            $http({
                method: 'DELETE',
                url: globalServerURL + 'payment' + '/' + deleteid + '/'
            }).success(function () {
                console.log("Deleted payment " + $scope.selectedItems[index].ID);
                index+=1;
                if (index < $scope.selectedItems.length){
                    $scope.deletePayment(index);
                }
                else{
                    for (var i in $scope.selectedItems){
                        var result = $.grep($scope.jsonpayments, function(e) {
                            return e.ID == $scope.selectedItems[i].ID;
                        });
                        var ind = $scope.jsonpayments.indexOf(result[0]);
                        if (ind>-1) {
                            $scope.jsonpayments[ind].selected = false;
                            $scope.jsonpayments.splice(ind, 1);
                        }
                    }
                }
            });
        };

        // set each item selected/unselected
        $scope.toggleAllCheckboxes = function(){
            var state = $scope.selectedItems.length != $scope.jsonpayments.length;
            for (var i in $scope.jsonpayments){
                $scope.jsonpayments[i].selected = state;
            }
        }

        // deselect all the selected orders
        $scope.clearSelectedItems = function(){
            if ($scope.selectedItems.length == $scope.jsonpayments.length){
                $scope.toggleAllCheckboxes();
            }
            else{
                for (var i in $scope.selectedItems){
                    var result = $.grep($scope.jsonpayments, function(e) {
                        return e.ID == $scope.selectedItems[i].ID;
                    });
                    var ind = $scope.jsonpayments.indexOf(result[0]);
                    if (ind>-1) {
                        $scope.jsonpayments[ind].selected = false;
                    }
                }
            }
        }

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'payments_report_filter'
            };
            $http(req).success(function(response) {
                $scope.paymentReportProjectsList = response['projects'];
                console.log("Payment report filter options loaded")
            })
        };

        $scope.getReport = function (report) {
            if ( report == 'payments' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'payments_report',
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
                    console.log("Payment pdf download error")
                });
            }
        };

    }
]);
