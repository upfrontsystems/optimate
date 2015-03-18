var grid;
var data = [];
var columns = [
        {id: "name", name: "Name", field: "name", width: 120, cssClass: "cell-title",
         editor: Slick.Editors.Text},
        {id: "budg_cost", name: "Budg Cost", field: "budg_cost", width: 100,
         editor: Slick.Editors.Text},
        {id: "order_cost", name: "Order Cost", field: "order_cost", width: 100,
         editor: Slick.Editors.Text},
        {id: "run_cost", name: "Run Cost", field: "run_cost", width: 100,
         editor: Slick.Editors.Text},
        {id: "claim_cost", name: "Claim Cost", field: "claim_cost", width: 100,
         editor: Slick.Editors.Text},
        {id: "income_rec", name: "Income Rec", field: "income_rec", width: 120,
         editor: Slick.Editors.Text},
        {id: "client_cost", name: "Client Cost", field: "client_cost", width: 100,
         editor: Slick.Editors.Text},
        {id: "proj_profit", name: "Proj. Profit", field: "proj_profit", width: 100,
         editor: Slick.Editors.Text},
        {id: "act_profit", name: "Act. Profit", field: "act_profit", width: 100,
         editor: Slick.Editors.Text},
    ];

var options = {
        editable: true,
        enableAddRow: true,
        enableCellNavigation: true,
        asyncEditorLoading: false,
        autoEdit: true
    };

$(function () {
    for (var i = 0; i < 10; i++) {
        var d = (data[i] = {});
        d["name"] = "Name " + i;
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

    grid.onAddNewRow.subscribe(function (e, args) {
        var item = args.item;
        grid.invalidateRow(data.length);
        data.push(item);
        grid.updateRowCount();
        grid.render();
    });
})
