var grid;
var data = [];
var title_cellwidth = 120;
var cellwidth = 75;
var columns = [
        {id: "name", name: "Name", field: "name",
         width: title_cellwidth, cssClass: "cell-title", 
         editor: Slick.Editors.Text},
        {id: "budg_cost", name: "Budg Cost", field: "budg_cost",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "order_cost", name: "Order Cost", field: "order_cost",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "run_cost", name: "Run Cost", field: "run_cost",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "claim_cost", name: "Claim Cost", field: "claim_cost",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "income_rec", name: "Income Rec", field: "income_rec",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "client_cost", name: "Client Cost", field: "client_cost",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "act_profit", name: "Act. Profit", field: "act_profit",
         width: cellwidth, editor: Slick.Editors.Text},
    ];

var columns_resource_category = [
        {id: "name", name: "Name", field: "name",
         width: title_cellwidth, cssClass: "cell-title", 
         editor: Slick.Editors.Text},
    ];

var columns_resource = [
        {id: "name", name: "Name", field: "name",
         width: title_cellwidth, cssClass: "cell-title", 
         editor: Slick.Editors.Text},
        {id: "rate", name: "Rate", field: "rate",
         width: cellwidth, editor: Slick.Editors.Text},
    ];

var columns_component = [
        {id: "name", name: "Name", field: "name",
         width: title_cellwidth, cssClass: "cell-title", 
         editor: Slick.Editors.Text},
        {id: "rate", name: "Rate", field: "rate",
         width: cellwidth, editor: Slick.Editors.Text},
        {id: "quantity", name: "Quantity", field: "quantity",
         width: cellwidth, editor: Slick.Editors.Text},
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
                // XXX here need to control which columns are displayed
                // eg: grid.setColumns(columns_component);
                grid.setData(data)
                grid.render();
            }
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
            console.log(data)
            grid.render();
        }
    });
});
