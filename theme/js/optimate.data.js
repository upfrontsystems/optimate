var grid;
var data = [];
var cell_large = 120;
var cell_medium = 75;
var cell_small = 50;
var columns = [
        {id: "name", name: "Name", field: "name",
         width: cell_large, cssClass: "cell-title", 
         editor: Slick.Editors.Text},
        {id: "budg_cost", name: "Total", field: "budg_cost",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "order_cost", name: "Order Cost", field: "order_cost",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "run_cost", name: "Run Cost", field: "run_cost",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "income_rec", name: "Income Rec", field: "income_rec",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "client_cost", name: "Client Cost", field: "client_cost",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "act_profit", name: "Act. Profit", field: "act_profit",
         width: cell_medium, editor: Slick.Editors.Text},
        {id: "rate", name: "Rate", field: "rate",
         width: cell_small, editor: Slick.Editors.Text},
        {id: "quantity", name: "Quantity", field: "quantity",
         width: cell_medium, editor: Slick.Editors.Text},
        { id: "id", name: "Id", field: "id",
         width: 0, minWidth: 0, maxWidth: 0,
         cssClass: "hide", headerCssClass: "hide"},
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

    // initial loading message
    for (var i = 0; i < 1; i++) {
        var d = (data[i] = {});
        d["name"] = "Loading data...";
    }

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

    grid.onCellChange.subscribe(function (e, args) {
        var $active = $(grid.getActiveCellNode())
        var cell = args.cell
        var row = args.row;
        var current_data = grid.getData(data);
        var value = current_data[args.row][grid.getColumns()[args.cell].field]
        var id = current_data[args.row][grid.getColumns()[11].field]
        $.ajax({
            url: 'http://127.0.0.1:8100/update_value',
            data: {
                'id' : id,
                'entry_type': 'Component',
                'new_value' : value
            },
            dataType: "json",
            success: function(data) {
                console.log('id_'+ id + ' updated')
            },
        });
      });
})

// on load, load up slickgrid with data from first project in the list
// hardwired for now as the root at the moment
$(document).ready(function() {
    $.ajax({
        url: 'http://127.0.0.1:8100/nodegridview/0/',
        dataType: "json",
        success: function(data) {
            grid.setData(data)
            grid.render();
        }
    });
});
