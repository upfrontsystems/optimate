// Directive for the custom modals, the html for the relevant modal is loaded
// from the directive attribute and compiled
allControllers.directive('customModals', function ($http, $compile, globalServerURL) {
    return {
        restrict: 'A',
        require: '?ngModel',
        transclude: true,
        // controller: 'ModalInstanceCtrl',
        link: function(scope, el, attrs, transcludeFn){
            scope.formData = {'NodeType': attrs.modalType};

            // observe the modal type for changes and set the formdata
            // this is used for adding nodes in the treeview by their type
            attrs.$observe('modalType', function(addingtype){
                if (addingtype){
                    scope.formData = {'NodeType': attrs.modalType};
                }
            })

            // get the modal template
            $http.get(attrs.modalSrc).
            success(function (response) {
                $compile(response)(scope, function(compliledElement, scope){
                    el.append(compliledElement);
                });
            });
        }
    };
});

// Directive for the slickgrid
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
            var cell_large = 300;
            var cell_medium = 75;
            var cell_small = 50;
            var columns = [
                    {id: "name", name: "Name", field: "name",
                     width: cell_large, cssClass: "cell-title non-editable-column"},
                    {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell editable-column",
                     width: cell_medium, editor: Slick.Editors.CustomEditor},
                    {id: "rate", name: "Rate", field: "rate",
                     width: cell_small, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "budg_cost", name: "Total", field: "budg_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "markup", name: "Markup", field: "markup",
                     width: cell_medium, cssClass: "cell non-editable-column"},
                    {id: "unit", name: "Unit", field: "unit",
                     width: cell_medium, cssClass: "cell  non-editable-column"},
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
              grid.render();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
              grid.invalidateRows(args.rows);
              grid.render();
            });

            // Formatter for displaying markup
            function MarkupFormatter(row, cell, value, columnDef, dataContext) {
                if (value != undefined){
                    return value + " %";
                }
                else{
                    return "";
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
                grid.render();
            });

            function loadSlickgrid(response){
                var newcolumns = [];
                var data = response['list'];
                // Get the value that indicated
                // whether there are empty columns
                var emptycolumns = response['emptycolumns'];
                if (data.length > 0){
                    // If the grid is only showing resources or resourcecategories
                    var secondtype = data[0]['node_type']
                    if ((secondtype == 'Resource') || (secondtype == 'ResourceCategory')){
                        if (data.length>1){
                            secondtype = data[1]['node_type']
                        }
                    }
                    if ((secondtype == 'Resource') || (secondtype == 'ResourceCategory')){
                        if (secondtype == 'Resource'){
                            newcolumns = [
                                {id: "name", name: "Name", field: "name",
                                 width: cell_large, cssClass: "cell-title non-editable-column"},
                                {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                                 width: cell_small, formatter: CurrencyFormatter, editor: Slick.Editors.Float},
                                 {id: "unit", name: "Unit", field: "unit",
                                width: cell_medium, cssClass: "cell non-editable-column"},
                                 {id: "type", name: "Type", field: "type",
                                width: cell_medium, cssClass: "cell non-editable-column"},
                            ];
                        }
                        else if (secondtype == 'ResourceCategory'){
                            newcolumns = [
                                {id: "name", name: "Name", field: "name",
                                 width: cell_large, cssClass: "cell-title non-editable-column"},
                            ];
                        }

                        grid.setColumns(newcolumns);
                        dataView.beginUpdate();
                        dataView.setItems(data);
                        dataView.endUpdate();

                        // Grey out ResourceCategory rate columns
                        for (var i=0; i < data.length; i++){
                            if (data[i]['node_type'] == 'ResourceCategory'){
                                grid.setCellCssStyles("non-editable-cell", {
                                   i: {
                                        "rate": "cell non-editable-column",
                                       },
                                });
                            }
                        }
                        dataView.beginUpdate();
                        dataView.endUpdate();
                        grid.render();
                    }
                    else {
                        // if there will be empty columns remove them
                        if (emptycolumns){
                            newcolumns = [
                                {id: "name", name: "Name", field: "name",
                                 width: cell_large, cssClass: "cell-title non-editable-column"},
                                {id: "budg_cost", name: "Total", field: "budg_cost",
                                 width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                {id: "sub_cost", name: "Subtotal", field: "sub_cost",
                                width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
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

                            grid.setColumns(newcolumns);
                            dataView.beginUpdate();
                            dataView.setItems(data);
                            dataView.endUpdate();
                            grid.render();
                        }
                        // otherwise loop through the data and grey out
                        // uneditable columns
                        else {
                            newcolumns = columns;

                            grid.setColumns(newcolumns);
                            dataView.beginUpdate();
                            dataView.setItems(data);
                            dataView.endUpdate();

                            for (var i=0; i < data.length; i++){
                                if (data[i]['node_type'] == 'BudgetGroup'){
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
                            grid.render();
                        }
                    }
                }
                else {
                    newcolumns = columns;
                    grid.setColumns(newcolumns);
                    dataView.beginUpdate();
                    dataView.setItems(data);
                    dataView.endUpdate();
                    grid.render();
                }
                console.log("Slickgrid data loaded");
            }

            // listening for the handle to reload the slickgrid
            $scope.$on('handleReloadSlickgrid', function(){
                var nodeid = sharedService.reloadId;
                var url = globalServerURL +'nodegridview/' + nodeid + '/'
                var target = document.getElementsByClassName('slick-viewport');
                var spinner = new Spinner().spin(target[0]);

                $http.get(url).success(function(response) {
                    spinner.stop(); // stop the spinner - ajax call complete
                    loadSlickgrid(response);
                });
            });

            // Listen for the call to clear the slickgrid
            $scope.$on('handleClearSlickgrid', function(){
                dataView.beginUpdate();
                dataView.setItems([]);
                dataView.endUpdate();
                grid.render();
            });

            // on cell change post to the server and update the totals
            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                var req = {
                    method: 'POST',
                    url: globalServerURL +'update_value/' + item.id + '/',
                    data: item}
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
