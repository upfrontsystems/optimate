$(document).on('shown.bs.modal', function(){
    if ( $('#saveModal').length && $('#saveModal').is(":visible") ) {
        $('input#inputName').val('');
        $('textarea#inputAddress').val('');
        $('input#inputCity').val('');
        $('input#inputStateProvince').val('');
        $('input#inputStateCountry').val('');
        $('input#inputZip').val('');
        $('input#inputPhone').val('');
        $('input#inputFax').val('');
        $('input#inputCellular').val('');
        $('input#inputContact').val('');
        $('input#inputName').focus();
    }
    else if ($('#addProject').length ) {
        $('input#inputName').val('');
        $('textarea#inputDescription').val('');
        $('input#inputName').focus();
    }
    else if ($('#addBudgetItem').length ) {
        $('input#inputName').val('');
        $('textarea#inputDescription').val('');
        $('input#inputQuantity').val('');
        $('input#inputMarkup').val('');
        $('input#inputName').focus();
    }
    else if ($('#addBudgetGroup').length ) {
        $('input#inputName').val('');
        $('textarea#inputDescription').val('');
        $('input#inputName').focus();
    }
    else if ($('#addResource').length ) {
        $('input#inputName').val('');
        $('textarea#inputDescription').val('');
        $('input#inputRate').val('');
    }
    else if ($('#addResourceCategory').length ) {
        $('input#inputName').val('');
        $('textarea#inputDescription').val('');
        $('input#inputName').focus();
    }
    else if ($('#addComponent').length ) {
        $('textarea#inputDescription').val('');
        $('input#inputQuantity').val('');
        $('input#inputMarkup').val('');
        $('input#inputType').val('');

        $('.finder').each(function() {
            var url = $(this).attr('data-url');
            var finder = new ContentFinder('#'+$(this).attr('id'), url, true);
            finder.listdir(url);
        });
    }
});