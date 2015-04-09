var grid;
var data = [];
var cell_large = 120;
var cell_medium = 75;
var cell_small = 50;
var columns = [
        {id: "name", name: "Name", field: "name",
         width: cell_large, cssClass: "cell-title"},
        {id: "budg_cost", name: "Total", field: "budg_cost",
         width: cell_medium, cssClass: "cell"},
        {id: "order_cost", name: "Order Cost", field: "order_cost",
         width: cell_medium, cssClass: "cell"},
        {id: "run_cost", name: "Run Cost", field: "run_cost",
         width: cell_medium, cssClass: "cell"},
        {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
         width: cell_medium, cssClass: "cell"},
        {id: "income_rec", name: "Income Rec", field: "income_rec",
         width: cell_medium, cssClass: "cell"},
        {id: "client_cost", name: "Client Cost", field: "client_cost",
         width: cell_medium, cssClass: "cell"},
        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
         width: cell_medium, cssClass: "cell"},
        {id: "act_profit", name: "Act. Profit", field: "act_profit",
         width: cell_medium, cssClass: "cell"},
        {id: "rate", name: "Rate", field: "rate", cssClass: "cell",
         width: cell_small, editor: Slick.Editors.Float},
        {id: "quantity", name: "Quantity", field: "quantity", cssClass: "cell",
         width: cell_medium, editor: Slick.Editors.Float},
    ];

var options = {
        editable: true,
        enableAddRow: true,
        enableCellNavigation: true,
        asyncEditorLoading: true,
        autoEdit: true,
        syncColumnCellResize: true,
    };

$(function () {

    data = []
    grid = new Slick.Grid("#optimate-data-grid", data, columns, options);
    grid.setSelectionModel(new Slick.CellSelectionModel());
    // show tooltips on hover if the cellsize is so small, that an ellipsis
    // '...' is being shown.
    autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
    grid.registerPlugin(autotooltips_plugin);

    grid.onAddNewRow.subscribe(function (e, args) {
        var item = args.item;
        grid.invalidateRow(data.length);
        data.push(item);
        grid.updateRowCount();
        grid.render();
    });

    // eventhandler to update grid data when a tree node is clicked
    $( document ).on( "click", ".treenode", function( e ) {
        var nodeid = $(this).attr('ID')
        var url = 'http://127.0.0.1:8100/nodegridview/' + nodeid + '/'
        $.ajax({
            url: url,
            dataType: "json",
            success: function(data) {
                grid.setData(data)
                grid.render();
            }
        });
    });

    grid.onCellChange.subscribe(function (e, ctx) {
        var item = ctx.item
        console.log(item.id)
        $.ajax({
            url: 'http://127.0.0.1:8100/update_value',
            data: item,
            dataType: "json",
            success: function(data) {
                console.log('id_'+ item.id + ' updated')
            },
        });
    });
})
