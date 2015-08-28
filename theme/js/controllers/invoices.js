// controller for the Invoice data from the server
myApp.controller('invoicesController', ['$scope', '$http', 'globalServerURL', '$timeout', 'SessionService',
    function($scope, $http, globalServerURL, $timeout, SessionService) {

        toggleMenu('invoices');
        $scope.dateTimeNow = function() {
            var d = new Date();
            // create a timezone agnostic date by setting time info to 0 and timezone to UTC.
            date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0));
            $scope.idate = date;
            $scope.pdate = date;
        };
        $scope.isDisabled = false;
        $scope.jsoninvoices = [];
        $scope.invoiceList = [];
        $scope.selectedInvoices = [];

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })

        // loading the project, client and supplier list
        $scope.clearFilters = function() {
            $scope.filters = [];
            $http.get(globalServerURL + 'projects/')
            .success(function(data) {
                $scope.projectsList = data;
            });

            $http.get(globalServerURL + 'suppliers')
            .success(function(data) {
                $scope.suppliersList = data;
            });

            $http.get(globalServerURL + 'clients')
            .success(function(data) {
                $scope.clientsList = data;
            });
        }
        $scope.projectsList = [];
        $scope.suppliersList = [];
        $scope.clientsList = [];
        $scope.clearFilters();

        $scope.invoicesLengthCheck = function() {
            if ($scope.jsoninvoices.length == 0) {
               $scope.invoicesReportEnabled = false;
            }
            else {
               $scope.invoicesReportEnabled = true;
            }
        }

        $scope.loadInvoiceSection = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices',
                params: {'Project': $scope.filters.Project,
                        'Client': $scope.filters.Client,
                        'Supplier': $scope.filters.Supplier,
                        'OrderNumber': $scope.filters.OrderNumber,
                        'InvoiceNumber': $scope.filters.InvoiceNumber,
                        'PaymentDate': $scope.filters.PaymentDate,
                        'Status': $scope.filters.Status}
            };
            $http(req).success(function(response) {
                $scope.jsoninvoices = response;
                $scope.invoicesLengthCheck();
                console.log("Invoices loaded");
            });
        }
        $scope.loadInvoiceSection();

        // filter the other filter options by what is selected
        $scope.filterBy = function(selection) {
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices/filter',
                params: $scope.filters
            };
            $http(req).success(function(response) {
                if (selection == 'project') {
                    if ($scope.filters.Project == null) {
                        $scope.projectsList = response['projects'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'client') {
                    if ($scope.filters.Client == null) {
                        $scope.clientsList = response['clients'];
                    }
                    $scope.projectsList = response['projects'];
                    $scope.suppliersList = response['suppliers'];
                }
                else if (selection == 'supplier') {
                    if ($scope.filters.Supplier == null) {
                        $scope.suppliersList = response['suppliers'];
                    }
                    $scope.clientsList = response['clients'];
                    $scope.projectsList = response['projects'];
                }
                else {
                    $scope.projectsList = response['projects'];
                    $scope.clientsList = response['clients'];
                    $scope.suppliersList = response['suppliers'];
                }
            })
        };

        // search for the orders that match the search term
        $scope.refreshOrders = function(searchterm) {
            if (searchterm.length > 0) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'orders',
                    params: {'OrderNumber': searchterm}
                };
                $http(req).success(function(response) {
                    response.pop();
                    $scope.ordersList = response;
                });
            }
        };

        $scope.orderSelected = function(item) {
            $scope.formData.OrderID = item.ID;
            $scope.calculatedAmounts[3].amount = item.Total;
        };

        // Adding or editing an invoice
        $scope.save = function() {
            // check if saving is disabled, if not disable it and save
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                if ($scope.modalState == 'Edit') {
                    $http({
                        method: 'PUT',
                        url: globalServerURL + 'invoice' + '/' + $scope.formData.id + '/',
                        data: $scope.formData
                    }).success(function (response) {
                        // edit the invoice in the list
                        $scope.handleEdited(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
                else {
                    $http({
                        method: 'POST',
                        url: globalServerURL + 'invoice/0/',
                        data: $scope.formData
                    }).success(function (response) {
                        // add the new invoice to the list
                        $scope.handleNew(response);
                        $scope.formData = {'NodeType': 'invoice'};
                    });
                }
            }
        };

        // add a new invoice to the list and sort
        $scope.handleNew = function(newinvoice) {
            $scope.jsoninvoices.push(newinvoice);
            // sort by invoice id
            $scope.jsoninvoices.sort(function(a, b) {
                var idA = a.id;
                var idB = b.id;
                return (idA > idB) ? -1 : (idA < idB) ? 1 : 0;
            });
            $scope.invoicesLengthCheck();
            console.log ("Invoice added");
        }

        // handle editing an invoice
        $scope.handleEdited = function(editedinvoice) {
            // search for the invoice and edit in the list
            var result = $.grep($scope.jsoninvoices, function(e) {
                return e.id == editedinvoice.id;
            });
            var i = $scope.jsoninvoices.indexOf(result[0]);
            if (i>-1) {
                $scope.jsoninvoices[i] = editedinvoice;
            }
            console.log ("Invoice edited");
        };

        // Set the selected invoice and change the css
        $scope.showActionsFor = function(obj) {
            $scope.selectedInvoice = obj;
        };

        // When the Add button is pressed change the state and form data
        $scope.addingState = function () {
            $scope.formData = {'NodeType': 'invoice',
                                'vat': '0.00'};
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.dateTimeNow();
            $scope.formData['Invoicedate'] = $scope.idate;
            $scope.formData['Paymentdate'] = $scope.pdate;
            $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': ''},
                                        {'name': 'VAT', 'amount': ''},
                                        {'name': 'Total', 'amount': ''},
                                        {'name': 'Order total', 'amount': ''}];
            if ($scope.selectedInvoice) {
                $('#invoice-'+$scope.selectedInvoice.id).removeClass('active');
                $scope.selectedInvoice = undefined;
            }
            $scope.ordersList = [];
            $scope.saveInvoiceModalForm.$setPristine();
        }

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $scope.isCollapsed = true;
            $scope.isDisabled = false;
            $scope.modalState = "Edit";
            $http({
                method: 'GET',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoice.id + '/'
            }).success(function(response) {
                $scope.formData = response;
                $scope.formData.selected = {'ID': response.OrderID,
                                            'Total': response.Ordertotal};
                $scope.calculatedAmounts = [{'name': 'Subtotal', 'amount': response.Amount},
                                        {'name': 'VAT', 'amount': response.VAT},
                                        {'name': 'Total', 'amount': response.Total},
                                        {'name': 'Order total', 'amount': response.Ordertotal}];
                $scope.refreshOrders(response.OrderID.toString());
                $scope.orderSelected($scope.formData.selected);
                $scope.idate = new Date($scope.formData['Invoicedate']);
                $scope.pdate = new Date($scope.formData['Paymentdate']);
                $scope.formData['NodeType'] = 'invoice';
            });
            // set each field dirty
            angular.forEach($scope.saveInvoiceModalForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // Delete an invoice and remove from the list
        $scope.deleteInvoice = function(index) {
            $http({
                method: 'DELETE',
                url: globalServerURL + 'invoice' + '/' + $scope.selectedInvoices[index].ID + '/'
            }).success(function () {
                console.log("Deleted invoice " + $scope.selectedInvoices[index].ID);
                index+=1;
                if (index < $scope.selectedInvoices.length){
                    $scope.deleteInvoice(index);
                }
                else{
                    $scope.selectedInvoice = undefined;
                    for (var i in $scope.selectedInvoices){
                        var result = $.grep($scope.jsoninvoices, function(e) {
                            return e.id == $scope.selectedInvoices[i].ID;
                        });
                        var ind = $scope.jsoninvoices.indexOf(result[0]);
                        if (ind>-1) {
                            $scope.jsoninvoices.splice(ind, 1);
                            $scope.invoicesLengthCheck();
                        }
                    }
                }
            });
        };

        $scope.checkOrderNumber = function() {
            // check if the order exists and set the form valid or invalid
            $http.get(globalServerURL + 'order/' + $scope.formData.OrderID + '/')
            .success(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', true);
                $scope.calculatedAmounts[3].amount = response.Total
            })
            .error(function(response) {
                $scope.saveInvoiceModalForm.inputOrderNumber.$setValidity('default1', false);
            });
        };

        $scope.updateAmounts = function() {
            var subtotal = parseFloat($scope.formData.Amount);
            var vatcost = parseFloat($scope.formData.VAT) ? parseFloat($scope.formData.VAT) : 0;
            var total = subtotal + vatcost;

            var parts = subtotal.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                subtotal = parts.join('.');
            }
            else {
                subtotal = subtotal.toString() + '.00'
            }

            parts = vatcost.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                vatcost = parts.join('.');
            }
            else {
                vatcost = vatcost.toString() + '.00'
            }

            parts = total.toString().split(".");
            if (parts.length > 1) {
                parts[1] = parts[1].slice(0,2);
                total = parts.join('.');
            }
            else {
                total = total.toString() + '.00'
            }

            $scope.calculatedAmounts[0].amount = subtotal;
            $scope.calculatedAmounts[1].amount = vatcost;
            $scope.calculatedAmounts[2].amount = total;
        }

        // fetch the report filter options
        $scope.filterReportBy = function() {
            $scope.filterByProject = false;
            $scope.filterBySupplier = false;
            $scope.filterByPaymentDate = false;
            $scope.filterByStatus = false;
            var req = {
                method: 'GET',
                url: globalServerURL + 'invoices_report_filter'
            };
            $http(req).success(function(response) {
                $scope.invoiceReportProjectsList = response['projects'];
                $scope.invoiceReportSuppliersList = response['suppliers'];
                $scope.invoiceReportPaymentDateList = response['paymentdates'];
                $scope.paymentDatesExist = response['paymentdates_exist'];
                $scope.invoiceReportStatusList = response['statuses'];
                console.log("Invoice report filter options loaded")
            })
        };

        // process an order
        $scope.toggleInvoiceStatus = function(status, index){
            $http({
                method: 'POST',
                url: globalServerURL + 'invoice/' + $scope.selectedInvoices[index].ID + '/status',
                data: {'status':status}
            }).success(function(){
                $scope.selectedInvoices[index].Status = status;
                console.log("Invoice " + $scope.selectedInvoices[index].ID + " status to " + status);
                index+=1;
                if (index < $scope.selectedInvoices.length){
                    $scope.toggleInvoiceStatus(status, index);
                }
            })
        }

        $scope.getReport = function (report) {
            if ( report == 'invoices' ) {
                var target = document.getElementsByClassName('pdf_download');
                var spinner = new Spinner().spin(target[0]);
                $scope.formData['FilterByProject'] = $scope.filterByProject;
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                $scope.formData['FilterByPaymentDate'] = $scope.filterByPaymentDate;
                $scope.formData['FilterByStatus'] = $scope.filterByStatus;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'invoices_report',
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
                    console.log("Invoice pdf download error")
                });
            }
        };

    }
]);
