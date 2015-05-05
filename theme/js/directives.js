allControllers.directive(
        'treeModel', ['$compile', '$http', 'globalServerURL', '$rootScope', '$templateCache', '$timeout', '$parse',
        function($compile, $http, globalServerURL, $rootScope, $templateCache, $timeout, $parse) {
            // All the functions used for the treeview are in the
            // treeviewFunctionsController controller
            // The treeview html is retrieved from treeview.html and compiled
            return {
                restrict: 'A',
                controller: 'treeviewFunctionsController',
                scope: {
                    treeModel:'='
                },
                // templateUrl: 'partials/treeview.html',
                link: function(scope, element, attrs) {
                    $http.get("partials/treeview.html", {cache: $templateCache})
                    .success(function(html) {
                        element.html(html);
                    }).then(function (response) {
                        var result = $compile(element.html())(scope);
                        element.html('').append(result);
                    });
                }
            };
}]);


allControllers.directive('treeviewMenu', function($compile) {
    return {
        restrict: 'AE',
        replace: true,
        scope: true,
        controller: 'treeviewFunctionsController',
        templateUrl: 'partials/treeview_menu.html'
        };
});

// Directive for the custom modals, the html for the relevant modal is loaded
// from the directive attribute and compiled
allControllers.directive('customModals', function ($http, $compile) {
    return {
        restrict: 'A',
        require: '?ngModel',
        transclude: true,
        scope:{
            ngModel: '='
        },
        templateUrl: '',
        controller: 'ModalInstanceCtrl',
        link: function(scope, el, attrs, transcludeFn){
            scope.formData = {'NodeType': attrs.modalType};
            $http.get(attrs.modalSrc).success(function (response) {
                $compile(response)(scope, function(compliledElement, scope){
                    el.append(compliledElement);
                });
            });
        }
    };
});

// Directive for the slickgrid
allControllers.directive('projectslickgridjs', ['globalServerURL', function(globalServerURL) {
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
                    {id: "markup", name: "Markup", field: "markup", cssClass: "cell  editable-column",
                     width: cell_medium, formatter: MarkupFormatter, editor: Slick.Editors.CustomEditor},
                    {id: "order_cost", name: "Order Cost", field: "order_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "run_cost", name: "Run Cost", field: "run_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "income_rec", name: "Income Rec", field: "income_rec",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "client_cost", name: "Client Cost", field: "client_cost",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                    {id: "act_profit", name: "Act. Profit", field: "act_profit",
                     width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
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
            autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
            grid.registerPlugin(autotooltips_plugin);

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

            // eventhandler to update grid data when a tree node is clicked
            $( document ).on( "click", ".treenode", function( e ) {
                var nodeid = $(this).attr('ID');
                var url = globalServerURL +'nodegridview/' + nodeid + '/'
                $.ajax({
                    url: url,
                    dataType: "json",
                    success: function(response) {
                        var newcolumns = [];
                        var data = response['list'];
                        // Get the value that indicated
                        // whether there are empty columns
                        var emptycolumns = response['emptycolumns'];
                        if (data.length > 0){
                            if (data[0]['node_type'] == 'Resource'){
                                newcolumns = [
                                    {id: "name", name: "Name", field: "name",
                                     width: cell_large, cssClass: "cell-title non-editable-column"},
                                    {id: "rate", name: "Rate", field: "rate", cssClass: "cell editable-column",
                                     width: cell_small, formatter: CurrencyFormatter, editor: Slick.Editors.Float},
                                ];

                                grid.setColumns(newcolumns);
                                dataView.beginUpdate();
                                dataView.setItems(data);
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
                                        {id: "order_cost", name: "Order Cost", field: "order_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "run_cost", name: "Run Cost", field: "run_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "income_rec", name: "Income Rec", field: "income_rec",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "client_cost", name: "Client Cost", field: "client_cost",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
                                        {id: "act_profit", name: "Act. Profit", field: "act_profit",
                                         width: cell_medium, cssClass: "cell non-editable-column", formatter: CurrencyFormatter},
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
                });
            });

            // eventhandler to blank grid data when a project is closed
            $( document ).on( "click", ".close-project", function( e ) {
                dataView.beginUpdate();
                dataView.setItems([]);
                dataView.endUpdate();
                grid.render();
            });

            grid.onCellChange.subscribe(function (e, ctx) {
                var item = ctx.item
                $.ajax({
                    url: globalServerURL +'update_value/' + item.id + '/',
                    data: item,
                    dataType: "json",
                    success: function(data) {
                        console.log('id_'+ item.id + ' updated')
                    },
                });
            });
        }
    }
}]);
