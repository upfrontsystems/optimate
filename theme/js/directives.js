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
            var column_width= {'name': 300,
                                'quantity': 75,
                                'rate': 50,
                                'budg_cost': 75,
                                'sub_cost': 75,
                                'unit': 75,
                                'ordered': 75,
                                'invoiced': 75,
                                'type': 75};
            var columns = [
                    {id: "name", name: "Name", field: "name",
                     width: column_width.name, cssClass: "cell-title non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                     width: column_width.quantity, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "rate",
                     width: column_width.rate, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "budg_cost", name: "Total", field: "budg_cost",
                     width: column_width.budg_cost, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                     width: column_width.sub_cost, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "unit", name: "Unit", field: "unit",
                     width: column_width.unit, cssClass: "cell  non-editable-column"},
                    {id: "ordered", name: "Ordered", field: "ordered",
                     width: column_width.ordered, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter},
                    {id: "invoiced", name: "Invoiced", field: "invoiced",
                     width: column_width.invoiced, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter}
                    // {id: "order_cost", name: "Order Cost", field: "order_cost",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "run_cost", name: "Run Cost", field: "run_cost",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "income_rec", name: "Income Rec", field: "income_rec",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "client_cost", name: "Client Cost", field: "client_cost",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    // {id: "act_profit", name: "Act. Profit", field: "act_profit",
                    //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
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
            grid = new Slick.Grid("#optimate-data-grid", dataView, columns, options);
            grid.setSelectionModel(new Slick.CellSelectionModel());

            // show tooltips on hover if the cellsize is so small, that an ellipsis
            // '...' is being shown.
            //autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
            //grid.registerPlugin(autotooltips_plugin);

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
                        column_width[gridcolumns[i].field] = gridcolumns[i].width;
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
                // Get the value that indicated
                // whether there are empty columns
                var emptycolumns = response['emptycolumns'];
                var no_subtotal_column = response['no_sub_cost'];
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
                                {id: "name", name: "Name", field: "name",
                                 width: column_width.name, cssClass: "cell-title non-editable-column"},
                                {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                                 width: column_width.rate, formatter: CurrencyFormatter, editor: Slick.Editors.Float},
                                 {id: "unit", name: "Unit", field: "unit",
                                width: column_width.unit, cssClass: "cell non-editable-column"},
                                 {id: "type", name: "Type", field: "type",
                                width: column_width.type, cssClass: "cell non-editable-column"},
                            ];
                        }
                        else if (secondtype == 'ResourceCategory') {
                            newcolumns = [
                                {id: "name", name: "Name", field: "name",
                                 width: column_width.name, cssClass: "cell-title non-editable-column"},
                            ];
                        }

                        grid.setColumns(newcolumns);
                        dataView.beginUpdate();
                        dataView.setItems(data);
                        dataView.endUpdate();

                        // Grey out ResourceCategory rate columns
                        for (var i=0; i < data.length; i++){
                            if (data[i]['node_type'] == 'ResourceCategory') {
                                grid.setCellCssStyles("non-editable-cell", {
                                   i: {
                                        "rate": "cell non-editable-column",
                                       },
                                });
                            }
                        }
                        dataView.beginUpdate();
                        dataView.endUpdate();
                        grid.resetActiveCell();
                        grid.setSelectedRows([]);
                        grid.render();
                    }
                    else {
                        // if there will be empty columns remove them
                        if (emptycolumns) {
                            newcolumns = [
                                {id: "name", name: "Name", field: "name",
                                 width: column_width.name, cssClass: "cell-title non-editable-column"},
                                {id: "budg_cost", name: "Total", field: "budg_cost",
                                 width: column_width.budg_cost, cssClass: "cell non-editable-column",
                                 formatter: CurrencyFormatter},
                                {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                                 width: column_width.sub_cost, cssClass: "cell non-editable-column",
                                 formatter: CurrencyFormatter},
                                {id: "ordered", name: "Ordered", field: "ordered",
                                 width: column_width.ordered, cssClass: "cell  non-editable-column",
                                 formatter: CurrencyFormatter},
                                {id: "invoiced", name: "Invoiced", field: "invoiced",
                                 width: column_width.invoiced, cssClass: "cell  non-editable-column", 
                                formatter: CurrencyFormatter}
                                // {id: "order_cost", name: "Order Cost", field: "order_cost",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "run_cost", name: "Run Cost", field: "run_cost",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "income_rec", name: "Income Rec", field: "income_rec",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "client_cost", name: "Client Cost", field: "client_cost",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                // {id: "act_profit", name: "Act. Profit", field: "act_profit",
                                //  width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                            ];
                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = newcolumns.map(function(e)
                                    { return e.id; }).indexOf("sub_cost");
                                if (index > -1) {
                                    newcolumns.splice(index, 1);
                                }
                            }
                            grid.setColumns(newcolumns);
                            dataView.beginUpdate();
                            dataView.setItems(data);
                            dataView.endUpdate();
                            grid.resetActiveCell();
                            grid.setSelectedRows([]);
                            grid.render();
                        }
                        // otherwise loop through the data and grey out
                        // uneditable columns
                        else {
                            emptycolumns = [{id: "name", name: "Name", field: "name",
                             width: column_width.name, cssClass: "cell-title non-editable-column"},
                            {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                             width: column_width.quantity, editor: Slick.Editors.CustomEditor},
                            {id: "rate", name: "Rate", field: "rate",
                             width: column_width.rate, cssClass: "cell non-editable-column", 
                            formatter: CurrencyFormatter},
                            {id: "budg_cost", name: "Total", field: "budg_cost",
                             width: column_width.budg_cost, cssClass: "cell non-editable-column", 
                            formatter: CurrencyFormatter},
                            {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                             width: column_width.sub_cost, cssClass: "cell non-editable-column", 
                            formatter: CurrencyFormatter},
                            {id: "unit", name: "Unit", field: "unit",
                             width: column_width.unit, cssClass: "cell  non-editable-column"},
                            {id: "ordered", name: "Ordered", field: "ordered",
                             width: column_width.ordered, cssClass: "cell  non-editable-column", 
                            formatter: CurrencyFormatter},
                            {id: "invoiced", name: "Invoiced", field: "invoiced",
                             width: column_width.invoiced, cssClass: "cell  non-editable-column", 
                            formatter: CurrencyFormatter}];
                            if (no_subtotal_column) {
                                // remove subtotal column
                                var index = emptycolumns.map(function(e)
                                    { return e.id; }).indexOf("sub_cost");
                                if (index > -1) {
                                    emptycolumns.splice(index, 1);
                                }
                            }
                            var overheadnames = [];
                            // Add columns for the overheads in the components
                            for (var i=0; i < data.length; i++) {
                                if (data[i]['node_type'] == 'Component') {
                                    // get the list of overheads in the component
                                    var overheadslist = data[i]['overheads'];
                                        // get the name of the overhead
                                        // check if it has not been used yet
                                        // and add it to the columns list
                                        for (var v=0; v < overheadslist.length; v++) {
                                            var overheadname = overheadslist[v].overhead_name;
                                            if (overheadnames.indexOf(overheadname) < 0) {
                                                overheadnames.push(overheadname);
                                            }
                                            // create new entry in the component
                                            data[i][overheadname] = overheadslist[v].percentage;
                                        }
                                }
                            }
                            // build the overhead columns
                            var overheadcolumns = [];
                            for (var i = 0; i<overheadnames.length; i++) {
                                column_width[overheadnames[i]] = 75;
                                overheadcolumns.push({id: overheadnames[i],
                                                    name: overheadnames[i],
                                                    field: overheadnames[i],
                                                    width: column_width[overheadnames[i]],
                                                    formatter: MarkupFormatter,
                                                    cssClass: "cell non-editable-column"})
                            }
                            newcolumns = emptycolumns.concat(overheadcolumns);

                            grid.setColumns(newcolumns);
                            dataView.beginUpdate();
                            grid.invalidateAllRows();
                            dataView.setItems(data);
                            dataView.endUpdate();

                            for (var i=0; i < data.length; i++) {
                                if (data[i]['node_type'] == 'BudgetGroup') {
                                    grid.setCellCssStyles("non-editable-cell", {
                                       i: {
                                            quantity: 'cell non-editable-column',
                                            markup: 'cell non-editable-column'
                                           },
                                    });
                                }
                            }
                            dataView.beginUpdate();
                            dataView.endUpdate();
                            grid.resetActiveCell();
                            grid.setSelectedRows([]);
                            grid.render();
                        }
                    }
                }
                else {
                    emptycolumns = [{id: "name", name: "Name", field: "name",
                             width: column_width.name, cssClass: "cell-title non-editable-column"},
                            {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                             width: column_width.quantity, editor: Slick.Editors.CustomEditor},
                            {id: "rate", name: "Rate", field: "rate",
                             width: column_width.rate, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                            {id: "budg_cost", name: "Total", field: "budg_cost",
                             width: column_width.budg_cost, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                            {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                             width: column_width.sub_cost, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                            {id: "unit", name: "Unit", field: "unit",
                             width: column_width.unit, cssClass: "cell  non-editable-column"},
                            {id: "ordered", name: "Ordered", field: "ordered",
                             width: column_width.ordered, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter},
                            {id: "invoiced", name: "Invoiced", field: "invoiced",
                             width: column_width.invoiced, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter}];
                    grid.setColumns(newcolumns);
                    dataView.beginUpdate();
                    dataView.setItems(data);
                    dataView.endUpdate();
                    grid.resetActiveCell();
                    grid.setSelectedRows([]);
                    grid.render();
                }
                console.log("Slickgrid data loaded");
            }

            // listening for the handle to reload the slickgrid
            $scope.$on('handleReloadSlickgrid', function() {
                var nodeid = sharedService.reloadId;
                var url = globalServerURL +'node/' + nodeid + '/grid/'
                var target = document.getElementsByClassName('slick-viewport');
                var spinner = new Spinner().spin(target[0]);

                $http.get(url).success(function(response) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    loadSlickgrid(response);
                });
            });

            // Listen for the call to clear the slickgrid
            $scope.$on('handleClearSlickgrid', function() {
                dataView.beginUpdate();
                dataView.setItems([]);
                dataView.endUpdate();
                grid.resetActiveCell();
                grid.setSelectedRows([]);
                grid.render();
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
                        item.budg_cost = data['total'];
                        item.sub_cost = data['subtotal'];
                        dataView.updateItem(item.id, item);
                    }
                    console.log('id_'+ item.id + ' updated')
                })
            });
        }
    }
}]);

allControllers.directive('componentslickgridjs', ['globalServerURL', 'sharedService', '$http', '$timeout',
    function(globalServerURL, sharedService, $http, $timeout) {
    return {
        require: '?ngModel',
        restrict: 'E',
        replace: true,
        template: '<div></div>',
        link: function($scope, element, attrs) {

            var grid;
            var data = [];
            var column_width= {'Name': 150,
                                'Quantity': 75,
                                'Rate': 50,
                                'Total': 75,
                                'Ordered': 75,
                                'Invoiced': 75,
                                'Type': 75};
            var columns = [
                    {id: "name", name: "Component", field: "Name",
                     width: column_width.Name, cssClass: "cell-title non-editable-column"},
                    {id: "Quantity", name: "Quantity", field: "Quantity", cssClass: "cell editable-column",
                     width: column_width.Quantity, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "Rate", cssClass: "cell editable-column",
                     width: column_width.Rate, formatter: CurrencyFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "total", name: "Total", field: "Total",
                     width: column_width.Total, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "ordered", name: "Ordered", field: "Ordered",
                    width: column_width.Ordered, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter},
                    {id: "invoiced", name: "Invoiced", field: "Invoiced",
                    width: column_width.Invoiced, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter}
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
            grid = new Slick.Grid("#component-data-grid", dataView, columns, options);
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
                        column_width[gridcolumns[i].field] = gridcolumns[i].width;
                }
            });

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

            // Formatter for displaying currencies
            function CurrencyFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined) {
                    var parts = value.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    return parts.join(".");
                }
                else {
                    return "0.00";
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

            // observe the component list for changes and update the slickgrid
            // calculate and update the order total as well
            $scope.$watch(attrs.components, function(componentlist) {
                columns = [
                    {id: "name", name: "Component", field: "Name",
                     width: column_width.Name, cssClass: "cell-title non-editable-column"},
                    {id: "Quantity", name: "Quantity", field: "Quantity", cssClass: "cell editable-column",
                     width: column_width.Quantity, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "Rate", cssClass: "cell editable-column",
                     width: column_width.Rate, formatter: CurrencyFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "total", name: "Total", field: "Total",
                     width: column_width.Total, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "ordered", name: "Ordered", field: "Ordered",
                    width: column_width.Ordered, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter},
                    {id: "invoiced", name: "Invoiced", field: "Invoiced",
                    width: column_width.Invoiced, cssClass: "cell  non-editable-column", formatter: CurrencyFormatter}
                    ];
                if (componentlist.length > 0) {
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems(componentlist);
                    dataView.endUpdate();
                    grid.resetActiveCell();
                    grid.setSelectedRows([]);
                    grid.render();
                    var total =0.0;
                    for (var i=0;i<componentlist.length; i++) {
                        total += parseFloat(componentlist[i]['Total']);
                    }
                    var parts = total.toString().split(".");
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    $scope.updateOrderTotal(parts.join("."));
                }
                else {
                    grid.setColumns(columns);
                    dataView.beginUpdate();
                    dataView.setItems([]);
                    dataView.endUpdate();
                    grid.resetActiveCell();
                    grid.setSelectedRows([]);
                    grid.render();
                }
            }, true);

            // on cell change update the totals
            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                var oldtotal = item.Total;
                item.Total = item.Quantity*item.Rate;
                dataView.updateItem(item.id, item);
                var ordertotal = parseFloat($scope.modalForm.Total.replace(/[^0-9-.]/g, ''));
                var newtotal = ordertotal + (item.Total - oldtotal);
                var parts = newtotal.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                $scope.updateOrderTotal(parts.join("."));
            });

            // listening for the handle to reload the order slickgrid
            // timeout to wait until the modal has finished rendering
            $scope.$on('handleReloadOrderSlickgrid', function() {
                $timeout(function(){
                    grid.resizeCanvas();
                });
            });
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
