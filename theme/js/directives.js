// Directive for the custom modals, the html for the relevant modal is loaded
// from the directive attribute and compiled
allControllers.directive('customModals', function ($http, $compile, globalServerURL) {
    return {
        restrict: 'A',
        require: '?ngModel',
        transclude: true,
        link: function(scope, el, attrs, transcludeFn) {
            scope.formData = {'NodeType': attrs.modalType};

            // observe the modal type for changes and set the formdata
            // this is used for adding nodes in the treeview by their type
            attrs.$observe('modalType', function(addingtype) {
                if (addingtype) {
                    scope.formData = {'NodeType': attrs.modalType};
                }
            })

            // get the modal template
            $http.get(attrs.modalSrc).
            success(function (response) {
                $compile(response)(scope, function(compliledElement, scope) {
                    el.append(compliledElement);
                });
            });
        }
    };
});

// Directive for the project slickgrid
allControllers.directive('projectslickgridjs', ['globalServerURL', 'sharedService', '$http',
    function(globalServerURL, sharedService, $http) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            // set the default column sizes
            var projects_column_width= {};
            // aux function to test if we can support localstorage
            var hasStorage = (function() {
                try {
                    var mod = 'modernizr';
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                }
                catch (exception) {
                    return false;
                }
            }());

            // override the getitemmetadata method
            function getItemMetaData(row){
                if (grid){
                    var rowData = grid.getDataItem(row);
                    if(rowData){
                        // on the first row, if it is the parent
                        // set selectable false and non-editable
                        if (row == 0  && grid.getDataItem(row).isparent){
                            return {selectable: false,
                                    'cssClasses': "non-editable-row"
                                };
                        }
                        // set the whole row non-editable for budgetgroups,resource categories and resource units
                        if(rowData.NodeType == 'BudgetGroup' || rowData.NodeType == 'ResourceCategory' || rowData.NodeType == 'ResourceUnit'){
                            return {'cssClasses': "non-editable-row"};
                        }
                        // otherwise if the parent is a budgetitem
                        // set it non-editable and unselectable
                        else if (rowData.NodeType == 'BudgetItem' && rowData.ParentType == 'BudgetItem'){
                            return {selectable: false,
                                    'cssClasses': "non-editable-row"
                                };
                        }

                    }
                }
                return {};
            }

            // load the columns widths (if any) from local storage
            $scope.preloadWidths = function () {
                projects_column_width= {'Name': 150,
                                    'Quantity': 75,
                                    'Rate': 75,
                                    'Total': 100};
                if (hasStorage) {
                    try {
                        projects_column_width = JSON.parse(localStorage["projects_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        localStorage["projects_column_width"] = JSON.stringify(projects_column_width);

                    }
                    if ( projects_column_width.length == 0 ) {
                        localStorage["projects_column_width"] = JSON.stringify(projects_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                }
            };
            $scope.preloadWidths();
            var name_column = {id: "Name", name: "Name", field: "Name",
                                    width: projects_column_width.Name,
                                    cssClass: "cell-title non-editable-column"}
            var quantity_column = {id: "Quantity", name: "Quantity", field: "Quantity",
                                    width: projects_column_width.Quantity,
                                    cssClass: "cell editable-column",
                                    editor: Slick.Editors.CustomEditor}
            var rate_column = {id: "Rate", name: "Rate", field: "Rate",
                                    width: projects_column_width.Rate,
                                    cssClass: "cell editable-column",
                                    formatter: CurrencyFormatter,
                                    editor: Slick.Editors.CustomEditor}
            var read_only_rate_column = {id: "Rate", name: "Rate", field: "Rate",
                                    width: projects_column_width.Rate,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var total_column = {id: "Total", name: "Total", field: "Total",
                                    width: projects_column_width.Total,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var subtotal_column = {id: "Subtotal", name: "Subtotal", field: "Subtotal",
                                    width: projects_column_width.Subtotal,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var unit_column = {id: "Unit", name: "Unit", field: "Unit",
                                    width: projects_column_width.Unit,
                                    cssClass: "cell non-editable-column"}
            var ordered_column = {id: "Ordered", name: "Ordered", field: "Ordered",
                                    width: projects_column_width.Ordered,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var invoiced_column = {id: "Invoiced", name: "Invoiced", field: "Invoiced",
                                    width: projects_column_width.Invoiced,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var resource_type_column =  {id: "ResourceType", name: "Resource Type", field: "ResourceType",
                                    width: projects_column_width.ResourceType,
                                    cssClass: "cell non-editable-column"}
            var columns = [
                    name_column,
                    quantity_column,
                    rate_column,
                    total_column,
                    subtotal_column,
                    unit_column,
                    ordered_column,
                    invoiced_column
                ];

            var options = {
                    editable: true,
                    enableAddRow: true,
                    enableCellNavigation: true,
                    asyncEditorLoading: true,
                    autoEdit: true,
                    syncColumnCellResize: true,
                    enableColumnReorder: true,
                    autoHeight: true
                };

            data = []
            dataView = new Slick.Data.DataView();
            dataView.getItemMetadata = getItemMetaData;
            grid = new Slick.Grid("#optimate-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.CustomSelectionModel());

            // render the grid with the given columns and data
            var renderGrid = function(columns, data) {
                grid.setColumns(columns);
                dataView.beginUpdate();
                dataView.setItems(data);
                dataView.endUpdate();
                grid.setSelectedRows([]);
                grid.render();
            }

            dataView.onRowCountChanged.subscribe(function (e, args) {
              grid.updateRowCount();
              grid.resetActiveCell();
              grid.setSelectedRows([]);
              grid.render();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
              grid.invalidateRows(args.rows);
              grid.resetActiveCell();
              grid.setSelectedRows([]);
              grid.render();
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        projects_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if(hasStorage) {
                    localStorage["projects_column_width"] = JSON.stringify(projects_column_width);
                }
            });

            // Formatter for displaying markup
            function MarkupFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    return value + " %";
                }
                else{
                    return "";
                }
              }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return parts.join(".");
                }
                else {
                    return "";
                }
              }

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(data.length);
                data.push(item);
                grid.updateRowCount();
                grid.resetActiveCell();
                grid.setSelectedRows([]);
                grid.render();
            });

            function loadSlickgrid(response) {
                var newcolumns = [];
                var data = response['list'];
                // Get the value that indicated whether there are empty columns
                var emptycolumns = response['emptycolumns'];
                var no_subtotal_column = response['no_sub_cost'];
                var no_quantity_column = response['no_quantity'];
                var type = response['type'];
                if (data.length > 0) {
                    // If the grid is only showing resource types
                    if (data[0].NodeType == 'ResourcePart'){
                        // for resource parts show a non-editable rate column
                        newcolumns = [
                            name_column,
                            quantity_column,
                            read_only_rate_column,
                            total_column
                        ];
                    }
                    else if (type == 'Resources') {
                        newcolumns = [
                            name_column,
                            rate_column,
                            unit_column,
                            resource_type_column,
                        ];
                    }
                    else if (type == 'ResourceCategories'){
                        newcolumns = [
                            name_column
                        ];
                    }
                    else {
                        // if there will be empty columns remove them
                        if (emptycolumns) {
                            newcolumns = [
                                name_column,
                                total_column,
                                subtotal_column,
                                ordered_column,
                                invoiced_column
                            ];
                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = newcolumns.map(function(e)
                                    { return e.id; }).indexOf("Subtotal");
                                if (index > -1) {
                                    newcolumns.splice(index, 1);
                                }
                            }
                        }
                        else {
                            emptycolumns = [
                                name_column,
                                quantity_column,
                                read_only_rate_column,
                                total_column,
                                subtotal_column,
                                unit_column,
                                ordered_column,
                                invoiced_column
                            ];

                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = emptycolumns.map(function(e)
                                    { return e.id; }).indexOf("Subtotal");
                                if (index > -1) {
                                    emptycolumns.splice(index, 1);
                                }
                            }

                            var overheadnames = [];
                            // Add columns for the overheads in the budgetItems
                            for (var i=0; i < data.length; i++) {
                                if (data[i]['node_type'] == 'BudgetItem') {
                                    // get the list of overheads in the budgetItem
                                    var overheadslist = data[i]['OverheadList'];
                                    // get the name of the overhead
                                    // check if it has not been used yet
                                    // and add it to the columns list
                                    for (var v=0; v < overheadslist.length; v++) {
                                        var overheadname = overheadslist[v].Name;
                                        if (overheadnames.indexOf(overheadname) < 0) {
                                            overheadnames.push(overheadname);
                                        }
                                        // create new entry in the budgetItem
                                        data[i][overheadname] = overheadslist[v].Percentage;
                                    }
                                }
                            }
                            // build the overhead columns
                            var overheadcolumns = [];
                            for (var i = 0; i<overheadnames.length; i++) {
                                projects_column_width[overheadnames[i]] = 75;
                                overheadcolumns.push({id: overheadnames[i],
                                                name: overheadnames[i],
                                                field: overheadnames[i],
                                                width: projects_column_width[overheadnames[i]],
                                                formatter: MarkupFormatter,
                                                cssClass: "cell non-editable-column"})
                            }
                            newcolumns = emptycolumns.concat(overheadcolumns);
                        }
                    }
                }
                else {
                    newcolumns = [
                        name_column,
                        quantity_column,
                        rate_column,
                        total_column,
                        subtotal_column,
                        unit_column,
                        ordered_column,
                        invoiced_column
                    ];
                }
                renderGrid(newcolumns, data)
                console.log("Slickgrid data loaded");
            }

            // reload the slickgrid
            $scope.handleReloadSlickgrid = function(reloadid) {
                var nodeid = reloadid;
                var url = globalServerURL +'node/' + nodeid + '/grid/'
                var target = document.getElementsByClassName('slick-viewport');
                var spinner = new Spinner().spin(target[0]);

                $http.get(url).success(function(response) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    loadSlickgrid(response);
                });
            };

            // clear the slickgrid
            $scope.handleClearSlickgrid = function() {
                dataView.beginUpdate();
                dataView.setItems([]);
                dataView.endUpdate();
                grid.resetActiveCell();
                grid.setSelectedRows([]);
                grid.render();
            };

            // on cell change post to the server and update the totals
            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                var req = {
                    method: 'POST',
                    url: globalServerURL +'node/' + item.id + '/update_value/',
                    data: item
                }
                $http(req).success(function(data) {
                    if (data){
                        item.Total = data.Total;
                        item.Subtotal = data.Subtotal;
                        //store the active cell and editor
                        var activeCell = grid.getActiveCell();
                        var activeEditor = grid.getCellEditor();
                        dataView.updateItem(item.id, item);

                        grid.setActiveCell(activeCell.row, activeCell.cell);
                        grid.editActiveCell();
                        dataView.syncGridSelection(grid, true);
                        console.log('Node '+ item.id + ' updated')
                    }
                    else{
                        console.log("No updates performed");
                    }
                })
            });

            var rowsSelected = false;
            grid.onSelectedRowsChanged.subscribe(function(e, args) {
                var selectedrows = grid.getSelectedRows();
                if (selectedrows.length > 0) {
                    var selectedRowIds = dataView.mapRowsToIds(selectedrows);
                    if((selectedRowIds.length > 0) && grid.getSelectionModel().ctrlClicked()) {
                        rowsSelected = true;
                    }
                    else{
                        rowsSelected = false;
                    }
                }
                else{
                    rowsSelected = false;
                }
                $scope.toggleRowsSelected(rowsSelected);
            });

            $scope.getSelectedNodes = function() {
                var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                var selectedNodes = [];
                for (var i in ids) {
                    var node = dataView.getItemById(ids[i]);
                    if (!node.isparent){
                        selectedNodes.push(node);
                    }
                }
                return selectedNodes;
            }

            $scope.cutSelectedNodes = function(nodearray) {
                for (var i in nodearray) {
                    dataView.deleteItem(nodearray[i].ID);
                }
                grid.invalidate();
                grid.render();
            };
        }
    }
}]);

allControllers.directive('budgetitemslickgridjs', ['globalServerURL', 'sharedService', '$http', '$timeout',
    function(globalServerURL, sharedService, $http, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            var orders_column_width= {};
            // aux function to test if we can support localstorage
            var hasStorage = (function() {
                try {
                    var mod = 'modernizr';
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                }
                catch (exception) {
                    return false;
                }
            }());

            // load the columns widths (if any) from local storage
            $scope.preloadWidths = function () {
                orders_column_width= {'Name': 350,
                                    'Quantity': 75,
                                    'Rate': 75,
                                    'Subtotal': 75,
                                    'VAT': 75,
                                    'VATCost': 75,
                                    'Total': 100};
                if (hasStorage) {
                    try {
                        orders_column_width = JSON.parse(localStorage["orders_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        localStorage["orders_column_width"] = JSON.stringify(orders_column_width);
                    }
                    if ( orders_column_width.length == 0 ) {
                        localStorage["orders_column_width"] = JSON.stringify(orders_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                }
            };
            $scope.preloadWidths();

            // override the getitemmetadata method
            function getItemMetaData(row) {
                // set the css for the last row with the totals
                if (grid) {
                    if(row == grid.getDataLength()-1) {
                        return {selectable: false,
                                'cssClasses': "sum-row non-editable-row"};
                    }
                }
            }

            var name_column = {id: "Name", name: "Budget Item", field: "Name",
                                    width: orders_column_width.Name,
                                    cssClass: "cell-title non-editable-column"}
            var quantity_column = {id: "Quantity", name: "Quantity", field: "Quantity",
                                    width: orders_column_width.Quantity,
                                    cssClass: "cell editable-column",
                                    editor: Slick.Editors.CustomEditor}
            var rate_column = {id: "Rate", name: "Rate", field: "Rate",
                                    width: orders_column_width.Rate,
                                    cssClass: "cell editable-column",
                                    formatter: CurrencyFormatter,
                                    editor: Slick.Editors.CustomEditor}
            var subtotal_column = {id: "Subtotal", name: "Subtotal", field: "Subtotal",
                                    width: orders_column_width.Subtotal,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var vat_column = {id: "VAT", name: "VAT %", field: "VAT",
                                    width: orders_column_width.VAT,
                                    cssClass: "cell editable-column",
                                    formatter: VATFormatter,
                                    editor: Slick.Editors.CustomEditor}
            var vatcost_column = {id: "VATCost", name: "VAT", field: "VATCost",
                                    width: orders_column_width.VATCost,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var total_column = {id: "Total", name: "Total", field: "Total",
                                    width: orders_column_width.Total,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var columns = [
                    name_column,
                    quantity_column,
                    rate_column,
                    subtotal_column,
                    vat_column,
                    vatcost_column,
                    total_column,
                ];

            var options = {
                    editable: true,
                    enableAddRow: true,
                    enableCellNavigation: true,
                    asyncEditorLoading: true,
                    autoEdit: true,
                    syncColumnCellResize: true,
                    enableColumnReorder: true,
                    explicitInitialization: true
                };

            data = []
            dataView = new Slick.Data.DataView();
            dataView.getItemMetadata = getItemMetaData;
            grid = new Slick.Grid("#budgetitem-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.CellSelectionModel());
            // resize the slickgrid when modal is shown
            $('#saveOrderModal').on('shown.bs.modal', function() {
                 grid.init();
                 grid.resizeCanvas();
                 $('#order_components .active').removeClass('active');
                 $('#order_components .editable').removeClass('editable');
                 $('#order_components .selected').removeClass('selected');
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        orders_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if(hasStorage) {
                    localStorage["orders_column_width"] = JSON.stringify(orders_column_width);
                }
            });

            dataView.onRowCountChanged.subscribe(function (e, args) {
              grid.updateRowCount();
              grid.render();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
              grid.invalidateRows(args.rows);
              grid.render();
            });

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    if (parts.length > 1) {
                        parts[parts.length-1] = parts[parts.length-1].slice(0,2);
                    }
                    return parts.join(".");
                }
                else {
                    return "";
                }
            }

            // Formatter for displaying the vat percentage
            function VATFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var percentile = parseFloat(value);
                    return (percentile.toString() + " %");
                }
                else {
                    return "";
                }
            }

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(dataView.length);
                dataView.push(item);
                grid.updateRowCount();
                grid.render();
            });

            // observe the budgetItem list for changes and update the slickgrid
            // calculate and update the order total as well
            $scope.$watch(attrs.budgetitems, function(budgetItemslist) {
                if (budgetItemslist.length > 0) {
                    var ordertotal = 0.0;
                    var ordersubtotal = 0.0
                    var ordervatcost = 0.0
                    var gridlist = [];
                    for (var i=0;i<budgetItemslist.length; i++) {
                        ordertotal += parseFloat(budgetItemslist[i].Total);
                        ordersubtotal += parseFloat(budgetItemslist[i].Subtotal);
                        ordervatcost += parseFloat(budgetItemslist[i].VATCost);
                    }
                    gridlist = budgetItemslist.slice(0);
                    var totals = {'id': 'T' + budgetItemslist[0].id,
                                    'Subtotal': ordersubtotal,
                                    'VATCost': ordervatcost,
                                    'Total': ordertotal,
                                    'cssClasses': 'cell-title non-editable-column'};

                    gridlist.push(totals);
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems(gridlist);
                    dataView.endUpdate();
                    grid.render();
                }
                else {
                    var gridlist = [];
                    var totals = {'id': 'T1',
                                'Subtotal': "",
                                'VATCost': "",
                                'Total': ""};
                    gridlist.push(totals);
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems(gridlist);
                    dataView.endUpdate();
                    grid.render();
                }
            }, true);

            // on cell change update the totals
            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                var oldtotal = item.Total;
                var oldsubtotal = item.Subtotal;
                var oldvatcost = item.VATCost;

                item.Subtotal = item.Quantity*item.Rate;
                item.VATCost = item.Subtotal * (parseFloat(item.VAT)/100.0);
                item.Total = item.Subtotal *(1.0 + parseFloat(item.VAT)/100.0);
                dataView.updateItem(item.id, item);
                // get the last row and update the values
                var datalength = dataView.getLength();
                var lastrow = dataView.getItem(datalength-1);
                lastrow.Total = lastrow.Total + (item.Total - oldtotal);
                lastrow.Subtotal = lastrow.Subtotal + (item.Subtotal - oldsubtotal);;
                lastrow.VATCost = lastrow.VATCost + (item.VATCost - oldvatcost);;
                dataView.updateItem(lastrow.id, lastrow);
            });

            // reload the order slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.handleReloadOrderSlickgrid = function() {
                $timeout(function() {
                    grid.resizeCanvas();
                });
            };
        }
    }
}]);


allControllers.directive('budgetgroupslickgridjs', ['globalServerURL', 'sharedService', '$http', '$timeout',
    function(globalServerURL, sharedService, $http, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            var valuations_column_width= {};
            // aux function to test if we can support localstorage
            var hasStorage = (function() {
                try {
                    var mod = 'modernizr';
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                }
                catch (exception) {
                    return false;
                }
            }());

            // load the columns widths (if any) from local storage
            $scope.preloadWidths = function () {
                if (hasStorage) {
                    valuations_column_width = {'Name': 270,
                                               'PercentageComplete': 80,
                                                'AmountComplete': 65};
                    try {
                        valuations_column_width = JSON.parse(localStorage["valuations_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        localStorage["valuations_column_width"] = JSON.stringify(valuations_column_width);
                    }
                    if ( valuations_column_width.length == 0 ) {
                        localStorage["valuations_column_width"] = JSON.stringify(valuations_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                }
            };
            $scope.preloadWidths();

            var columns = [
                    {id: "Name", name: "Budget Group", field: "Name",
                     width: valuations_column_width.Name,
                     cssClass: "cell-title non-editable-column"},
                    {id: "PercentageComplete", name: "% Complete", field: "PercentageComplete",
                     cssClass: "cell editable-column", formatter: PercentageFormatter,
                     editor: Slick.Editors.CustomEditor},
                    {id: "AmountComplete", name: "Total", field: "AmountComplete", cssClass: "cell non-editable-column",
                      formatter: CurrencyFormatter, width: valuations_column_width.AmountComplete}
                ];

            var options = {
                    editable: true,
                    enableAddRow: true,
                    enableCellNavigation: true,
                    asyncEditorLoading: true,
                    autoEdit: true,
                    syncColumnCellResize: true,
                    enableColumnReorder: true,
                    explicitInitialization: true
                };

            data = []
            dataView = new Slick.Data.DataView();
            grid = new Slick.Grid("#budgetgroup-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.CellSelectionModel());
            // resize the slickgrid when modal is shown
            $('#saveValuationModal').on('shown.bs.modal', function() {
                 grid.init();
                 grid.resizeCanvas();
                 $('#valuation_budgetgroups .active').removeClass('active');
                 $('#valuation_budgetgroups .editable').removeClass('editable');
                 $('#valuation_budgetgroups .selected').removeClass('selected');
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        valuations_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if(hasStorage) {
                    localStorage["valuations_column_width"] = JSON.stringify(valuations_column_width);
                }
            });

            dataView.onRowCountChanged.subscribe(function (e, args) {
              grid.updateRowCount();
              grid.render();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
              grid.invalidateRows(args.rows);
              grid.render();
            });

            // Formatter for displaying percentages
            function PercentageFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    return value + ' %';
                }
                else {
                    return "0 %";
                }
            }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return parts.join(".");
                }
                else {
                    return "";
                }
            }

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(dataView.length);
                dataView.push(item);
                grid.updateRowCount();
                grid.render();
            });

            // observe the budgetgroup list for changes and update the slickgrid
            $scope.$watch(attrs.budgetgroups, function(budgetgrouplist) {
                if (budgetgrouplist.length > 0) {
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems(budgetgrouplist);
                    dataView.endUpdate();
                    grid.render();
                }
                else {
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems([]);
                    dataView.endUpdate();
                    grid.render();
                }
            }, true);

            // on cell change update the totals
            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                if (item.PercentageComplete > 100) {
                    item.PercentageComplete = 100;
                }
                else if (item.PercentageComplete < 0) {
                    item.PercentageComplete = 0;
                }
                item.AmountComplete = (item.TotalBudget/100) * item.PercentageComplete;
                item.AmountComplete = item.AmountComplete.toFixed(2);
                dataView.updateItem(item.id, item);
            });

            // reload the valuation slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.handleReloadValuationSlickgrid = function() {
                $timeout(function() {
                    grid.resizeCanvas();
                });
            };
        }
    }
}]);


allControllers.directive('dateParser', dateParser);
function dateParser() {
    return {
        link: link,
        restrict: 'A',
        require: 'ngModel'
    };
    function link(scope, element, attrs, ngModel) {
        var moment = window.moment,
            dateFormat = attrs.dateParser,
            alternativeFormat = dateFormat.replace('DD', 'D').replace('MM', 'M'); //alternative do accept days and months with a single digit
        //use push to make sure our parser will be the last to run
        ngModel.$formatters.push(formatter);
        ngModel.$parsers.push(parser);

        function parser(viewValue) {
            var value = ngModel.$viewValue; //value that none of the parsers touched
            if(value) {
                var date = moment(value, [dateFormat, alternativeFormat], true);
                ngModel.$setValidity('date', date.isValid());
                return date.isValid() ? date._d : value;
            }
            return value;
        }

        function formatter(value) {
            var m = moment(value);
            var valid = m.isValid();
            if (valid) return m.format(dateFormat);
            else return value;
        }
    }
}

/* directive for validating float types */
allControllers.directive('smartFloat', function ($filter) {
    var FLOAT_REGEXP_1 = /^\$?\d+.(\d{3})*(\,\d*)$/; //Numbers like: 1.123,56
    var FLOAT_REGEXP_2 = /^\$?\d+,(\d{3})*(\.\d*)$/; //Numbers like: 1,123.56
    var FLOAT_REGEXP_3 = /^\$?\d+(\.\d*)?$/; //Numbers like: 1123.56
    var FLOAT_REGEXP_4 = /^\$?\d+(\,\d*)?$/; //Numbers like: 1123,56

    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
            ctrl.$parsers.unshift(function (viewValue) {
                if (FLOAT_REGEXP_1.test(viewValue)) {
                    ctrl.$setValidity('float', true);
                    return parseFloat(viewValue.replace('.', '').replace(',', '.'));
                } else if (FLOAT_REGEXP_2.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue.replace(',', ''));
                } else if (FLOAT_REGEXP_3.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue);
                } else if (FLOAT_REGEXP_4.test(viewValue)) {
                        ctrl.$setValidity('float', true);
                        return parseFloat(viewValue.replace(',', '.'));
                }else {
                    ctrl.$setValidity('float', false);
                    return undefined;
                }
            });

            ctrl.$formatters.unshift(
               function (modelValue) {
                   return $filter('number')(parseFloat(modelValue) , 2);
               }
           );
        }
    };
});
