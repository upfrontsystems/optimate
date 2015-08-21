// Directive for the custom modals, the html for the relevant modal is loaded
// from the directive attribute and compiled
myApp.directive('customModals', function ($http, $compile, globalServerURL) {
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
myApp.directive('projectslickgridjs', ['globalServerURL', '$http',
    function(globalServerURL, $http) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;

            $scope.$on('$destroy', function(){
                if (grid){ grid.destroy(); grid = null; }
            });

            var data = [];
            // set the default column sizes
            var projects_column_width= {};
            var projects_columns = [];
            var columns_list = {};
            // aux function to test if we can support localstorage
            var hasStorage = (function() {
                try {
                    var mod = 'modernizr';
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                }
                catch (exception) {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                    return false;
                }
            }());

            // override the getitemmetadata method
            function getItemMetaData(row) {
                if (grid) {
                    var rowData = grid.getDataItem(row);
                    if (rowData) {
                        // on the first row, if it is the parent
                        // set selectable false and non-editable
                        if (row == 0  && rowData.isparent) {
                            return {selectable: false,
                                    'cssClasses': "non-editable-row"
                                };
                        }
                        // set the whole row non-editable for budgetgroups,resource categories and resource units
                        if (rowData.NodeType == 'BudgetGroup' || rowData.NodeType == 'ResourceCategory' || rowData.NodeType == 'ResourceUnit') {
                            return {'cssClasses': "non-editable-row"};
                        }
                        // otherwise if the parent is a budgetitem
                        // set it non-editable and unselectable
                       if (rowData.NodeType == 'BudgetItem' && rowData.ParentType == 'BudgetItem') {
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
            };
            $scope.preloadWidths();

            // load the columns (if any) from local storage
            $scope.preloadColumns = function () {
                // set the default order
                projects_columns = ["Name",
                                    "Code",
                                    "Unit",
                                    "Quantity",
                                    "Rate",
                                    "ReadRate",
                                    "Subtotal",
                                    "Markup",
                                    "Total",
                                    "Ordered",
                                    "Invoiced",
                                    "ResourceType"]
                if (hasStorage) {
                    var columns = [];
                    try {
                        columns = JSON.parse(localStorage["projects_columns"]);
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                    }
                    if (columns.length < projects_columns.length) {
                        localStorage["projects_columns"] = JSON.stringify(projects_columns);
                    }
                    else{
                        projects_columns = columns;
                    }
                }
            };
            $scope.preloadColumns();

            function initialiseColumns() {
                columns_list.Name = {id: "Name", name: "Name", field: "Name",
                                    width: projects_column_width.Name,
                                    cssClass: "cell-title non-editable-column"}
                columns_list.Quantity = {id: "Quantity", name: "Quantity", field: "Quantity",
                                    width: projects_column_width.Quantity,
                                    cssClass: "cell editable-column",
                                    editor: Slick.Editors.CustomEditor}
                columns_list.Rate = {id: "Rate", name: "Rate", field: "Rate",
                                    width: projects_column_width.Rate,
                                    cssClass: "cell editable-column",
                                    formatter: CurrencyFormatter,
                                    editor: Slick.Editors.CustomEditor}
                columns_list.ReadRate = {id: "ReadRate", name: "Rate", field: "Rate",
                                    width: projects_column_width.Rate,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.Total = {id: "Total", name: "Total", field: "Total",
                                    width: projects_column_width.Total,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.Markup = {id: "Markup", name: "Markup", field: "Markup",
                                    width: projects_column_width.Markup,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.Subtotal = {id: "Subtotal", name: "Subtotal", field: "Subtotal",
                                    width: projects_column_width.Subtotal,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.Unit = {id: "Unit", name: "Unit", field: "Unit",
                                    width: projects_column_width.Unit,
                                    cssClass: "text-cell non-editable-column"}
                columns_list.Ordered = {id: "Ordered", name: "Ordered", field: "Ordered",
                                    width: projects_column_width.Ordered,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.Invoiced = {id: "Invoiced", name: "Invoiced", field: "Invoiced",
                                    width: projects_column_width.Invoiced,
                                    cssClass: "cell non-editable-column",
                                    formatter: CurrencyFormatter}
                columns_list.ResourceType =  {id: "ResourceType", name: "Resource Type",
                                    field: "ResourceType",
                                    width: projects_column_width.ResourceType,
                                    cssClass: "text-cell non-editable-column"}
                columns_list.Code = {id: "Code", name: "Product Code", field: "Code",
                                    width: projects_column_width.Code,
                                    cssClass: "text-cell non-editable-column"}
            }
            initialiseColumns();

            var columns = [];
            var shown = ["Name", "Unit", "Quantity", "Rate", "Subtotal",
                        "Markup", "Total", "Ordered", "Invoiced"];
            for (var c in projects_columns){
                if (shown.indexOf(projects_columns[c]) > -1){
                    columns.push(columns_list[projects_columns[c]]);
                }
            }

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
            var dataView = new Slick.Data.DataView();
            dataView.getItemMetadata = getItemMetaData;
            grid = new Slick.Grid("#optimate-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.ProjectsSelectionModel());

            // render the grid with the given columns and data
            var renderGrid = function(columns, data) {
                grid.setColumns(columns);
                dataView.beginUpdate();
                dataView.setItems(data);
                dataView.endUpdate();
                grid.invalidate();
            }

            function loadSlickgrid(response) {
                var newcolumns = [];
                var data = response['list'];
                // Get the value that indicated whether there are empty columns
                var emptycolumns = response['emptycolumns'];
                var type = response['type'];
                if (data.length > 0) {
                    // If the grid is only showing resource types
                    if ((data[0].NodeType == 'ResourceUnit' && data[0].isparent) || (data[0].NodeType == 'ResourcePart')) {
                        // for resource parts show a non-editable rate column
                        var shown = ["Name", "Quantity", "ReadRate", "Total"];
                        for (var c in projects_columns){
                            if (shown.indexOf(projects_columns[c]) > -1){
                                newcolumns.push(columns_list[projects_columns[c]]);
                            }
                        }
                    }
                    else if (type == 'Resources') {
                        var shown = ["Name", "Code", "Unit", "Rate", "ResourceType"];
                        for (var c in projects_columns){
                            if (shown.indexOf(projects_columns[c]) > -1){
                                newcolumns.push(columns_list[projects_columns[c]]);
                            }
                        }
                    }
                    else if (type == 'ResourceCategories') {
                        var shown = ["Name"];
                        for (var c in projects_columns){
                            if (shown.indexOf(projects_columns[c]) > -1){
                                newcolumns.push(columns_list[projects_columns[c]]);
                            }
                        }
                    }
                    else {
                        // if there will be empty columns remove them
                        if (emptycolumns) {
                            var shown = ["Name", "Total", "Ordered", "Invoiced"];
                            for (var c in projects_columns){
                                if (shown.indexOf(projects_columns[c]) > -1){
                                    newcolumns.push(columns_list[projects_columns[c]]);
                                }
                            }
                        }
                        else {
                            plaincolumns = [];
                            var shown = ["Name", "Unit", "Quantity", "Rate",
                                        "Subtotal","Markup", "Total", "Ordered", "Invoiced"];
                            for (var c in projects_columns){
                                if (shown.indexOf(projects_columns[c]) > -1){
                                    plaincolumns.push(columns_list[projects_columns[c]]);
                                }
                            }

                            var overheadnames = [];
                            // Add columns for the overheads in the budgetItems
                            for (var i=0; i < data.length; i++) {
                                if ((data[i]['NodeType'] == 'BudgetItem') || (data[i]['NodeType'] == 'SimpleBudgetItem')) {
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
                                overheadcolumns.push({id: overheadnames[i],
                                                name: overheadnames[i],
                                                field: overheadnames[i],
                                                width: projects_column_width[overheadnames[i]],
                                                formatter: MarkupFormatter,
                                                cssClass: "cell non-editable-column"})
                            }
                            newcolumns = plaincolumns.concat(overheadcolumns);
                        }
                    }
                }
                else {
                    var shown = ["Name", "Unit", "Quantity", "Rate", "Subtotal",
                        "Markup", "Total", "Ordered", "Invoiced"];
                    for (var c in projects_columns){
                        if (shown.indexOf(projects_columns[c]) > -1){
                            newcolumns.push(columns_list[projects_columns[c]]);
                        }
                    }
                }
                renderGrid(newcolumns, data)
                console.log("Slickgrid data loaded");
            }

            // reload the slickgrid
            $scope.handleReloadSlickgrid = function(nodeid) {
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
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width) {
                        projects_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                    }
                }
                // rebuild the columns with the new widths
                initialiseColumns();
                if (hasStorage) {
                    localStorage["projects_column_width"] = JSON.stringify(projects_column_width);
                }
            });

            // when the columns are reordered
            grid.onColumnsReordered.subscribe(function (e, args) {
                if (hasStorage) {
                    var gridcolumns = grid.getColumns();
                    var ordercolumns = []
                    for (var c in gridcolumns){
                        ordercolumns.push(gridcolumns[c].id);
                    }

                    for(var i = 0; i < ordercolumns.length; i++) {
                        var indexI = projects_columns.indexOf(ordercolumns[i]);
                        for(var j = i + 1; j < ordercolumns.length; j++) {
                            var indexJ = projects_columns.indexOf(ordercolumns[j]);
                            if(indexI > indexJ) {
                                var temp = projects_columns[indexI];
                                projects_columns[indexI] = projects_columns[indexJ];
                                projects_columns[indexJ] = temp;
                                indexI = indexJ;
                            }
                        }
                    }
                    localStorage["projects_columns"] = JSON.stringify(projects_columns);
                }
            });

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
                        //store the active cell and editor
                        var activeCell = grid.getActiveCell();
                        var activeEditor = grid.getCellEditor();
                        // if the parent row has been updated, reload the slickgrid
                        if (item.isparent){
                            $http.get(globalServerURL +'node/' + item.ID + '/grid/')
                            .success(function(response) {
                                loadSlickgrid(response);
                                grid.setActiveCell(activeCell.row, activeCell.cell);
                                grid.editActiveCell();
                                dataView.syncGridSelection(grid, true);
                            });
                        }
                        else{
                            var oldtotal = item.Total;
                            item.Total = data.Total;
                            item.Subtotal = data.Subtotal;
                            dataView.updateItem(item.id, item);

                            // check if the first row is a parent
                            var firstrow = dataView.getItem(0);
                            if (firstrow.isparent){
                                // update the parent total or rate
                                if (firstrow.NodeType == 'ResourceUnit'){
                                    total = parseFloat(firstrow.Rate) +
                                                    (parseFloat(item.Total) -
                                                    parseFloat(oldtotal));
                                    firstrow.Rate = total
                                }
                                else{
                                    total = parseFloat(firstrow.Total) +
                                                    (parseFloat(item.Total) -
                                                    parseFloat(oldtotal));
                                    firstrow.Total = total
                                }
                                dataView.updateItem(firstrow.id, firstrow);
                            }
                            grid.setActiveCell(activeCell.row, activeCell.cell);
                            grid.editActiveCell();
                            dataView.syncGridSelection(grid, true);
                        }
                        console.log('Node '+ item.id + ' updated')
                    }
                    else {
                        console.log("No updates performed");
                    }
                })
            });

            var rowsSelected = false;
            grid.onSelectedRowsChanged.subscribe(function(e, args) {
                var selectedrows = grid.getSelectedRows();
                if (selectedrows.length > 0) {
                    var selectedRowIds = dataView.mapRowsToIds(selectedrows);
                    if ((selectedRowIds.length > 0) && grid.getSelectionModel().ctrlClicked()) {
                        rowsSelected = true;
                    }
                    else {
                        rowsSelected = false;
                    }
                }
                else {
                    rowsSelected = false;
                }
                $scope.toggleRowsSelected(rowsSelected);
            });

            // if the user does not have edit permissions the cell can't be edited
            grid.onBeforeEditCell.subscribe(function(e,args) {
                // users without permission can't edit
                if ($scope.user.permissions.projects != 'edit') {
                    return false;
                }
                if (args.item){
                    // can't edit budgetitems that are children of budget items
                    if (args.item.NodeType == 'BudgetItem' && args.item.ParentType == 'BudgetItem') {
                        return false;
                    }
                    // can't edit resource unit
                    if (args.item.NodeType == 'ResourceUnit'){
                        return false;
                    }
                }
            });

            $scope.getSelectedNodes = function() {
                var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                var selectedNodes = [];
                for (var i in ids) {
                    var node = dataView.getItemById(ids[i]);
                    if (!node.isparent) {
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
            };

            grid.onAddNewRow.subscribe(function (e, args) {
                var item = args.item;
                grid.invalidateRow(data.length);
                data.push(item);
                grid.updateRowCount();
                grid.resetActiveCell();
                grid.setSelectedRows([]);
                grid.render();
            });

            // Formatter for displaying markup
            function MarkupFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    return value + " %";
                }
                else {
                    return "";
                }
            }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    if (parts.length > 1) {
                        parts[parts.length-1] = parts[parts.length-1].slice(0,2);
                    }
                    return $scope.currency + parts.join(".");
                }
                else {
                    return "";
                }
            }
        }
    }
}]);

myApp.directive('budgetitemslickgridjs', ['globalServerURL', '$http', '$timeout',
    function(globalServerURL, $http, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            $scope.$on('$destroy', function(){
                if (grid){ grid.destroy(); grid = null; }
            });

            var data = [];
            var columns_widths= {};
            // aux function to test if we can support localstorage
            var hasStorage = (function() {
                try {
                    var mod = 'modernizr';
                    localStorage.setItem(mod, mod);
                    localStorage.removeItem(mod);
                    return true;
                }
                catch (exception) {
                    console.log("LOCAL STORAGE NOT SUPPORTED")
                    return false;
                }
            }());

            // load the columns widths (if any) from local storage
            $scope.preloadWidths = function () {
                column_widths = {'Name': 350,
                                    'Quantity': 75,
                                    'Rate': 75,
                                    'Subtotal': 75,
                                    'VAT': 75,
                                    'VATCost': 75,
                                    'Total': 100};
                if (hasStorage) {
                    try {
                        columns_widths = JSON.parse(localStorage["orders_column_width"])
                    }
                    catch (exception) {
                        console.log("No columns widths found in storage. Setting to default.");
                        localStorage["orders_column_width"] = JSON.stringify(columns_widths);
                    }
                    if ( columns_widths.length == 0 ) {
                        localStorage["orders_column_width"] = JSON.stringify(columns_widths);
                    }
                }
            };
            $scope.preloadWidths();

            // override the getitemmetadata method
            function getItemMetaData(row) {
                // set the css for the last row with the totals
                if (grid) {
                    if (row == grid.getDataLength()-1) {
                        return {selectable: false,
                                'cssClasses': "sum-row non-editable-row"};
                    }
                }
            }

            var name_column, quantity_column, rate_column, total_column,
                subtotal_column, vat_column,vatcost_column;
            function initialiseColumns() {
                name_column = {id: "Name", name: "Name", field: "Name",
                                width: columns_widths.Name,
                                cssClass: "cell-title non-editable-column"}
                quantity_column = {id: "Quantity", name: "Quantity", field: "Quantity",
                                width: columns_widths.Quantity,
                                cssClass: "cell editable-column",
                                editor: Slick.Editors.CustomEditor}
                rate_column = {id: "Rate", name: "Rate", field: "Rate",
                                width: columns_widths.Rate,
                                cssClass: "cell editable-column",
                                formatter: CurrencyFormatter,
                                editor: Slick.Editors.CustomEditor}
                total_column = {id: "Total", name: "Total", field: "Total",
                                width: columns_widths.Total,
                                cssClass: "cell non-editable-column",
                                formatter: CurrencyFormatter}
                subtotal_column = {id: "Subtotal", name: "Subtotal", field: "Subtotal",
                                width: columns_widths.Subtotal,
                                cssClass: "cell non-editable-column",
                                formatter: CurrencyFormatter}
                vat_column = {id: "VAT", name: "VAT %", field: "VAT",
                                width: columns_widths.VAT,
                                cssClass: "cell editable-column",
                                formatter: VATFormatter,
                                editor: Slick.Editors.CustomEditor}
                vatcost_column = {id: "VATCost", name: "VAT", field: "VATCost",
                                width: columns_widths.VATCost,
                                cssClass: "cell non-editable-column",
                                formatter: CurrencyFormatter}
            }
            initialiseColumns();

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
            var dataView = new Slick.Data.DataView();
            dataView.getItemMetadata = getItemMetaData;
            grid = new Slick.Grid("#budgetitem-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.OrdersSelectionModel());
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
                        columns_widths[gridcolumns[i].field] = gridcolumns[i].width;
                }
                // rebuild the columns
                initialiseColumns();
                if (hasStorage) {
                    localStorage["orders_column_width"] = JSON.stringify(columns_widths);
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
                    return $scope.currency + parts.join(".");
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
                    grid.invalidate();
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

            grid.onSelectedRowsChanged.subscribe(function(e, args) {
                var selectedrows = grid.getSelectedRows();
                var rowsSelected = false;
                if (selectedrows.length > 0) {
                    var selectedRowIds = dataView.mapRowsToIds(selectedrows);
                    if ((selectedRowIds.length > 0) && grid.getSelectionModel().ctrlClicked()) {
                        rowsSelected = true;
                    }
                    else {
                        rowsSelected = false;
                    }
                }
                else {
                    rowsSelected = false;
                }
                $scope.toggleRowsSelected(rowsSelected);
            });

            $scope.getSelectedNodes = function() {
                var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                var selectedNodes = [];
                for (var i in ids) {
                    var node = dataView.getItemById(ids[i]);
                    if (!node.isparent) {
                        selectedNodes.push(node);
                    }
                }
                return selectedNodes;
            }

            $scope.clearSelectedRows = function(){
                $scope.toggleRowsSelected(false);
                grid.setSelectedRows([]);
                grid.render();
            };
        }
    }
}]);


myApp.directive('budgetgroupslickgridjs', ['globalServerURL', '$http', '$timeout',
    function(globalServerURL, $http, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            $scope.$on('$destroy', function(){
                if (grid){ grid.destroy(); grid = null; }
            });

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
                                                'TotalBudget': 150,
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
            };
            $scope.preloadWidths();

            var columns = [
                    {id: "Name", name: "Budget Group", field: "Name",
                        width: valuations_column_width.Name,
                        cssClass: "cell-title non-editable-column"},
                    {id: "TotalBudget", name: "Budget Total", field: "TotalBudget",
                        width: valuations_column_width.TotalBudget, formatter: CurrencyFormatter,
                        cssClass: "cell non-editable-column"},
                    {id: "PercentageComplete", name: "% Complete", field: "PercentageComplete",
                        width: valuations_column_width.PercentageComplete,
                        cssClass: "cell editable-column", formatter: PercentageFormatter,
                    editor: Slick.Editors.CustomEditor},
                    {id: "AmountComplete", name: "Total", field: "AmountComplete",
                        width: valuations_column_width.AmountComplete, formatter: CurrencyFormatter,
                        cssClass: "cell non-editable-column"}
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
            var dataView = new Slick.Data.DataView();
            grid = new Slick.Grid("#budgetgroup-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.OrdersSelectionModel());
            // resize the slickgrid when modal is shown
            $('#saveValuationModal').on('shown.bs.modal', function() {
                 grid.init();
                 grid.setSelectedRows([]);
                 grid.resizeCanvas();
            });

            // when a column is resized change the default size of that column
            grid.onColumnsResized.subscribe(function(e,args) {
                var gridcolumns = args.grid.getColumns();
                for (var i in gridcolumns) {
                    if (gridcolumns[i].previousWidth != gridcolumns[i].width)
                        valuations_column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
                if (hasStorage) {
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
                    var parts = value.toString().split(".");
                    // if the percentage has a long decimal cut it at 3
                    if (parts.length > 1 && parts[parts.length-1].length > 3){
                        parts[parts.length-1] = parts[parts.length-1].slice(0,3);
                        value = parts.join('.')
                    }
                    return value + ' %';
                }
                else {
                    return "";
                }
            }

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return $scope.currency + parts.join(".");
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
                $scope.cellSelected = true;
                var item = ctx.item
                if (item.PercentageComplete > 100) {
                    item.PercentageComplete = 100;
                }
                else if (item.PercentageComplete < 0) {
                    item.PercentageComplete = 0;
                }
                // sometimes total budget is undefined
                item.TotalBudget = item.TotalBudget ? item.TotalBudget : 0;
                var oldamount = item.AmountComplete;
                item.AmountComplete = (item.TotalBudget/100) * item.PercentageComplete;
                item.AmountComplete = item.AmountComplete.toFixed(2);
                dataView.updateItem(item.id, item);

                // if this is a level two item, update the total of the parent
                if (item.level == '2'){
                    var rowindex = ctx.row;
                    var level = item.level;
                    while ((rowindex > 0) && level == '2'){
                        rowindex-=1;
                        parent = dataView.getItem(rowindex);
                        level = parent.level;
                    }
                    parent.AmountComplete = parent.AmountComplete ? parent.AmountComplete : 0;
                    var difference = item.AmountComplete - oldamount;
                    parent.AmountComplete = (parseFloat(parent.AmountComplete) +
                                            difference).toFixed(2);
                    dataView.updateItem(parent.id, parent);
                }
            });

            // reload the valuation slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.handleReloadValuationSlickgrid = function() {
                $timeout(function() {
                    grid.invalidate();
                    grid.resizeCanvas();
                });
            };

            grid.onSelectedRowsChanged.subscribe(function(e, args) {
                var selectedrows = grid.getSelectedRows();
                var selectable = false;
                var expanded = false;
                if (selectedrows.length > 0) {
                    var selectedRowIds = dataView.mapRowsToIds(selectedrows);
                    if (selectedRowIds.length > 0) {
                        selectable = true;
                        var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                        for (var i in ids){
                            var node = dataView.getItemById(ids[i]);
                            // if any of the nodes are level 2, cant select
                            if (node.level == '2'){
                                selectable = false;
                                break;
                            }

                            // if one of the rows is already expanded
                            // keep expanded true
                            if (!expanded){
                                if (node.expanded){
                                    expanded = true;
                                }
                            }
                        }
                    }
                }
                $scope.toggleRowsSelected(selectable, expanded);
            });

            grid.onBeforeEditCell.subscribe(function(e,args) {
                if (args.item){
                    // cant edit an expanded row
                    if (args.item.expanded) {
                        return false;
                    }
                }
            });

            // return an array of the selected node data
            $scope.getSelectedNodes = function() {
                var ids = dataView.mapRowsToIds(grid.getSelectedRows());
                var selectedNodes = [];
                for (var i in ids) {
                    var node = dataView.getItemById(ids[i]);
                    if (!node.isparent) {
                        selectedNodes.push(node);
                    }
                }
                return selectedNodes;
            }

            // select another row, including the current selected rows
            $scope.selectRow = function(rowIndex){
                var rowArray = grid.getSelectedRows();
                rowArray.push(rowIndex);
                grid.setSelectedRows(rowArray);
            }

            $scope.clearSelectedRows = function(){
                grid.setSelectedRows([]);
                grid.render();
            };
        }
    }
}]);


myApp.directive('dateParser', dateParser);
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
            if (value) {
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
myApp.directive('smartFloat', function ($filter) {
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
