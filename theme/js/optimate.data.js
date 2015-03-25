var grid;
var data = [];
var cellwidth = 75;
var columns = [
        {id: "name", name: "Name", field: "name", width: 120, cssClass: "cell-title",
         editor: Slick.Editors.Text},
        {id: "budg_cost", name: "Budg Cost", field: "budg_cost", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "order_cost", name: "Order Cost", field: "order_cost", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "run_cost", name: "Run Cost", field: "run_cost", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "claim_cost", name: "Claim Cost", field: "claim_cost", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "income_rec", name: "Income Rec", field: "income_rec", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "client_cost", name: "Client Cost", field: "client_cost", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit", width: cellwidth,
         editor: Slick.Editors.Text},
        {id: "act_profit", name: "Act. Profit", field: "act_profit", width: cellwidth,
         editor: Slick.Editors.Text},
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

    // generate sample data
    for (var i = 0; i < 10; i++) {
        var d = (data[i] = {});
        d["name"] = "Project Name " + i;
        d["budg_cost"] = "x";
        d["order_cost"] = "x";
        d["run_cost"] = "x";
        d["claim_cost"] = "x";
        d["income_rec"] = "x";
        d["client_cost"] = "x";
        d["proj_profit"] = "x";
        d["act_profit"] = "x";
    }

    grid = new Slick.Grid("#optimate-data-grid", data, columns, options);
    grid.setSelectionModel(new Slick.CellSelectionModel());
    // show tooltips on hover if the cellsize is so small, that an ellipsis '...' is being shown.
    autotooltips_plugin = new Slick.AutoTooltips({enableForHeaderCells: true})
    grid.registerPlugin(autotooltips_plugin);

    grid.onAddNewRow.subscribe(function (e, args) {
        var item = args.item;
        grid.invalidateRow(data.length);
        data.push(item);
        grid.updateRowCount();
        grid.render();
    });

    $.ajax({
        url: 'http://127.0.0.1:8100/nodegridview',
        data: {
            'parentid': 155908,
        },
        dataType: "json",
        success: function(data) {
            grid.setData(data)
            grid.render();
        }
    });

})

//$(document).ready(function() {

// });
