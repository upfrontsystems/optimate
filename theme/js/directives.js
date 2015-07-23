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
                if (addingtype){
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
                // on the first row, if it is the parent
                // set selectable false and non-editable
                if (row == 0 && grid){
                    if (grid.getDataItem(row)){
                        if (grid.getDataItem(row).isparent){
                            return {selectable: false,
                                    'cssClasses': "non-editable-row"
                                };
                        }
                    }
                }
                // set the whole row non-editable for budgetgroups and resource categories
                if (grid){
                    var rowData = grid.getDataItem(row);
                    if(rowData){
                        if(rowData.node_type == 'BudgetGroup' || rowData.node_type == 'ResourceCategory'){
                            return {'cssClasses': "non-editable-row"};
                        }
                    }
                }
                return {};
            }

            // load the columns widths (if any) from local storage
            $scope.preloadWidths = function () {
                if (hasStorage) {
                    try {
                        projects_column_width = JSON.parse(localStorage["projects_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        projects_column_width= {'name': 300,
                                'quantity': 75,
                                'item_quantity': 75,
                                'rate': 50,
                                'budg_cost': 75,
                                'sub_cost': 75,
                                'unit': 75,
                                'ordered': 75,
                                'invoiced': 75,
                                'resource_type': 75};
                        localStorage["projects_column_width"] = JSON.stringify(projects_column_width);

                    }
                    if ( projects_column_width.length == 0 ) {
                        projects_column_width= {'name': 150,
                                    'quantity': 75,
                                    'rate': 75,
                                    'total': 100};
                        localStorage["projects_column_width"] = JSON.stringify(projects_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                    projects_column_width= {'name': 150,
                                'quantity': 75,
                                'rate': 75,
                                'total': 100};
                }
            };
            $scope.preloadWidths();
            var name_column = {id: "name", name: "Name", field: "name",
                                    width: projects_column_width.name,
                                    cssClass: "cell-title non-editable-column"}
            var quantity_column = {id: "quantity", name: "Quantity", field: "quantity",
                                    width: projects_column_width.quantity,
                                    cssClass: "cell non-editable-column"}
            var item_quantity_column = {id: "item_quantity", name: "Item Quantity", field: "item_quantity",
                                    width: projects_column_width.item_quantity,
                                    cssClass: "cell editable-column",
                                    editor: Slick.Editors.CustomEditor}
            var rate_column = {id: "rate", name: "Rate", field: "rate",
                                    width: projects_column_width.rate,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter,
                                    editor: Slick.Editors.CustomEditor}
            var budg_cost_column = {id: "budg_cost", name: "Total", field: "budg_cost",
                                    width: projects_column_width.budg_cost,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var sub_cost_column = {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                                    width: projects_column_width.sub_cost,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var unit_column = {id: "unit", name: "Unit", field: "unit",
                                    width: projects_column_width.unit,
                                    cssClass: "cell non-editable-column"}
            var ordered_column = {id: "ordered", name: "Ordered", field: "ordered",
                                    width: projects_column_width.ordered,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var invoiced_column = {id: "invoiced", name: "Invoiced", field: "invoiced",
                                    width: projects_column_width.invoiced,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
            var resource_type_column =  {id: "resource_type", name: "Resource Type", field: "resource_type",
                                    width: projects_column_width.resource_type,
                                    cssClass: "cell non-editable-column"}
            var columns = [
                    name_column,
                    quantity_column,
                    item_quantity_column,
                    rate_column,
                    budg_cost_column,
                    sub_cost_column,
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
            var renderGrid = function(columns, data){
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
                if(hasStorage){
                    localStorage["projects_column_width"] = JSON.stringify(projects_column_width);
                }
            });

            // Formatter for displaying markup
            function MarkupFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined){
                    return value + " %";
                }
                else{
                    return "0";
                }
              }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined){
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
                    // If the grid is only showing resources or resourcecategories
                    var secondtype = data[0]['node_type']
                    if ((secondtype == 'Resource') || (secondtype == 'ResourceCategory')) {
                        if (data.length>1) {
                            secondtype = data[1]['node_type']
                        }
                    }
                    if ((secondtype == 'Resource') || (secondtype == 'ResourceCategory')) {
                        if (secondtype == 'Resource') {
                            newcolumns = [
                                name_column,
                                rate_column,
                                unit_column,
                                resource_type_column,
                            ];
                        }
                        else if (secondtype == 'ResourceCategory') {
                            newcolumns = [
                                name_column
                            ];
                        }
                        renderGrid(newcolumns, data)
                    }
                    else {
                        // if there will be empty columns remove them
                        if (emptycolumns) {
                            newcolumns = [
                                name_column,
                                budg_cost_column,
                                sub_cost_column,
                                ordered_column,
                                invoiced_column
                            ];
                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = newcolumns.map(function(e)
                                    { return e.id; }).indexOf("sub_cost");
                                if (index > -1) {
                                    newcolumns.splice(index, 1);
                                }
                            }
                            renderGrid(newcolumns, data)
                        }
                        // otherwise loop through the data and grey out
                        // uneditable columns
                        else {
                            emptycolumns = [
                                name_column,
                                quantity_column,
                                item_quantity_column,
                                rate_column,
                                budg_cost_column,
                                sub_cost_column,
                                unit_column,
                                ordered_column,
                                invoiced_column
                            ];

                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = emptycolumns.map(function(e)
                                    { return e.id; }).indexOf("sub_cost");
                                if (index > -1) {
                                    emptycolumns.splice(index, 1);
                                }
                            }
                            if (no_quantity_column) {
                                // remove quantity column
                                var index = emptycolumns.map(function(e)
                                    { return e.id; }).indexOf("quantity");
                                if (index > -1) {
                                    emptycolumns.splice(index, 1);
                                }
                            }
                            // make quantity column non-editable for certain node types
                            hidden_iq_types = ['BudgetItem'];
                            var itemquantity_type_found = $.inArray(type, hidden_iq_types) > -1;
                            if (!itemquantity_type_found) {
                                var index = emptycolumns.map(function(e)
                                    { return e.id; }).indexOf("quantity");
                                if (index > -1) {
                                    emptycolumns[index].cssClass = "cell non-editable-column";
                                    delete emptycolumns[index].editor;
                                }
                            }

                            var overheadnames = [];
                            // Add columns for the overheads in the budgetItems
                            for (var i=0; i < data.length; i++) {
                                if (data[i]['node_type'] == 'BudgetItem') {
                                    // get the list of overheads in the budgetItem
                                    var overheadslist = data[i]['overheads'];
                                        // get the name of the overhead
                                        // check if it has not been used yet
                                        // and add it to the columns list
                                        for (var v=0; v < overheadslist.length; v++) {
                                            var overheadname = overheadslist[v].overhead_name;
                                            if (overheadnames.indexOf(overheadname) < 0) {
                                                overheadnames.push(overheadname);
                                            }
                                            // create new entry in the budgetItem
                                            data[i][overheadname] = overheadslist[v].percentage;
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
                            renderGrid(newcolumns, data)
                        }
                    }
                }
                else {
                    emptycolumns = [
                        name_column,
                        quantity_column,
                        item_quantity_column,
                        rate_column,
                        budg_cost_column,
                        sub_cost_column,
                        unit_column,
                        ordered_column,
                        invoiced_column
                    ];
                    renderGrid(emptycolumns, data)
                }
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
                        item.quantity = data.quantity;
                        item.budg_cost = data.total;
                        item.sub_cost = data.subtotal;
                        item.rate = data.rate;
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
                if (selectedrows.length > 0){
                    var selectedRowIds = dataView.mapRowsToIds(selectedrows);
                    if((selectedRowIds.length > 0) && grid.getSelectionModel().ctrlClicked()){
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

            $scope.getSelectedNodes = function(){
                var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                var selectedNodes = [];
                for (var i in ids){
                    var node = dataView.getItemById(ids[i]);
                    node.NodeType = node.node_type;
                    node.ID = node.id;
                    node.Name = node.name;
                    if (!node.isparent){
                        selectedNodes.push(node);
                    }
                }
                return selectedNodes;
            }

            $scope.cutSelectedNodes = function(nodearray){
                for (var i in nodearray){
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
                if (hasStorage) {
                    try {
                        orders_column_width = JSON.parse(localStorage["orders_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        orders_column_width= {'name': 350,
                                    'quantity': 75,
                                    'rate': 75,
                                    'subtotal': 75,
                                    'vat': 75,
                                    'vatcost': 75,
                                    'total': 100};
                        localStorage["orders_column_width"] = JSON.stringify(orders_column_width);
                    }
                    if ( orders_column_width.length == 0 ) {
                        orders_column_width= {'name': 350,
                                    'quantity': 75,
                                    'rate': 75,
                                    'subtotal': 75,
                                    'vat': 75,
                                    'vatcost': 75,
                                    'total': 100};
                        localStorage["orders_column_width"] = JSON.stringify(orders_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                    orders_column_width= {'name': 350,
                                'quantity': 75,
                                'rate': 75,
                                'subtotal': 75,
                                'vat': 75,
                                'vatcost': 75,
                                'total': 100};
                }
            };
            $scope.preloadWidths();

            // override the getitemmetadata method
            function getItemMetaData(row){
                // set the css for the last row with the totals
                if (grid){
                    if(row == grid.getDataLength()-1){
                        return {selectable: false,
                                'cssClasses': "sum-row non-editable-row"};
                    }
                }
                return {};
            }

            var columns = [
                    {id: "name", name: "Budget Item", field: "name",
                     width: orders_column_width.name, cssClass: "cell-title non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                     width: orders_column_width.quantity, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                     width: orders_column_width.rate, formatter: CurrencyFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "subtotal", name: "Subtotal", field: "subtotal", cssClass: "cell non-editable-column",
                     width: orders_column_width.subtotal, formatter: CurrencyFormatter},
                     {id: "vat", name: "VAT %", field: "vat", cssClass: "cell editable-column",
                     width: orders_column_width.vat, formatter: VATFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "vatcost", name: "VAT", field: "vatcost", cssClass: "cell non-editable-column",
                     width: orders_column_width.vatcost, formatter: CurrencyFormatter},
                    {id: "total", name: "Total", field: "total", cssClass: "cell non-editable-column",
                     width: orders_column_width.total, formatter: CurrencyFormatter}];

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
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        orders_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if(hasStorage){
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
                    if (parts.length > 1){
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
                columns = [
                    {id: "name", name: "Budget Item", field: "name",
                     width: orders_column_width.name, cssClass: "cell-title non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                     width: orders_column_width.quantity, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                     width: orders_column_width.rate, formatter: CurrencyFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "subtotal", name: "Subtotal", field: "subtotal", cssClass: "cell non-editable-column",
                     width: orders_column_width.subtotal, formatter: CurrencyFormatter},
                     {id: "vat", name: "VAT %", field: "vat", cssClass: "cell editable-column",
                     width: orders_column_width.vat, formatter: VATFormatter, editor: Slick.Editors.CustomEditor},
                     {id: "vatcost", name: "VAT", field: "vatcost", cssClass: "cell non-editable-column",
                     width: orders_column_width.vatcost, formatter: CurrencyFormatter},
                    {id: "total", name: "Total", field: "total", cssClass: "cell non-editable-column",
                     width: orders_column_width.total, formatter: CurrencyFormatter}];
                if (budgetItemslist.length > 0) {
                    var ordertotal = 0.0;
                    var ordersubtotal = 0.0
                    var ordervatcost = 0.0
                    var gridlist = [];
                    for (var i=0;i<budgetItemslist.length; i++) {
                        ordertotal += parseFloat(budgetItemslist[i].total);
                        ordersubtotal += parseFloat(budgetItemslist[i].subtotal);
                        ordervatcost += parseFloat(budgetItemslist[i].vatcost);
                    }
                    gridlist = budgetItemslist.slice(0);
                    var totals = {'id': 'T' + budgetItemslist[0].id,
                                    'subtotal': ordersubtotal,
                                    'vatcost': ordervatcost,
                                    'total': ordertotal,
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
                                'subtotal': "0.00",
                                'vatcost': "0.00",
                                'total': "0.00"};
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
                var oldtotal = item.total;
                var oldsubtotal = item.subtotal;
                var oldvatcost = item.vatcost;

                item.subtotal = item.quantity*item.rate;
                item.vatcost = item.subtotal * (parseFloat(item.vat)/100.0);
                item.total = item.subtotal *(1.0 + parseFloat(item.vat)/100.0);
                dataView.updateItem(item.id, item);
                // get the last row and update the values
                var datalength = dataView.getLength();
                var lastrow = dataView.getItem(datalength-1);
                lastrow.total = lastrow.total + (item.total - oldtotal);
                lastrow.subtotal = lastrow.subtotal + (item.subtotal - oldsubtotal);;
                lastrow.vatcost = lastrow.vatcost + (item.vatcost - oldvatcost);;
                dataView.updateItem(lastrow.id, lastrow);
            });

            // reload the order slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.handleReloadOrderSlickgrid = function() {
                $timeout(function(){
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
                    try {
                        valuations_column_width = JSON.parse(localStorage["valuations_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        valuations_column_width = {'name': 300,
                                                   'percentage_complete': 65};
                        localStorage["valuations_column_width"] = JSON.stringify(valuations_column_width);
                    }
                    if ( valuations_column_width.length == 0 ) {
                        valuations_column_width = {'name': 300,
                                                   'percentage_complete': 65};
                        localStorage["valuations_column_width"] = JSON.stringify(valuations_column_width);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                    valuations_column_width = {'name': 300,
                                               'percentage_complete': 65};
                }
            };
            $scope.preloadWidths();

            var columns = [
                    {id: "name", name: "Budget Group", field: "name",
                     width: valuations_column_width.name, cssClass: "cell-title non-editable-column"},
                    {id: "percentage_complete", name: "Percentage Complete", field: "percentage_complete",
                     cssClass: "cell editable-column", formatter: PercentageFormatter,
                     width: valuations_column_width.percentage_complete, editor: Slick.Editors.CustomEditor}];

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
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        valuations_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if(hasStorage){
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

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(dataView.length);
                dataView.push(item);
                grid.updateRowCount();
                grid.render();
            });

            // observe the budgetgroup list for changes and update the slickgrid
            $scope.$watch(attrs.budgetgroups, function(budgetgrouplist) {
                columns = [
                    {id: "name", name: "Budget Group", field: "name",
                     width: valuations_column_width.name, cssClass: "cell-title non-editable-column"},
                    {id: "percentage_complete", name: "% Complete", field: "percentage_complete",
                     cssClass: "cell editable-column", formatter: PercentageFormatter,
                     width: valuations_column_width.percentage_complete, editor: Slick.Editors.Float}];
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

            // reload the valuation slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.handleReloadValuationSlickgrid = function() {
                $timeout(function(){
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
