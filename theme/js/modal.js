$(document).on('shown.bs.modal', function(){    

    $('#addProject').on('shown.bs.modal', function(){
        $('input#inputName').val('');
        $('input#inputDescription').val('');
        $('input#inputName').focus()
    });
    $('#addBudgetItem').on('shown.bs.modal', function(){
        $('input#inputName').val('');
        $('input#inputDescription').val('');
        $('input#inputQuantity').val('');
        $('input#inputMarkup').val('');
        $('input#inputName').focus()
    });
    $('#addBudgetGroup').on('shown.bs.modal', function(){
        $('input#inputName').val('');
        $('input#inputDescription').val('');
        $('input#inputName').focus()
    });
    $('#addResource').on('shown.bs.modal', function(){
        $('input#inputName').val('');
        $('input#inputDescription').val('');
        $('input#inputRate').val('');
    });
    $('#addResourceCategory').on('shown.bs.modal', function(){
        $('input#inputName').val('');
        $('input#inputDescription').val('');
        $('input#inputName').focus()
    });
    $('#addComponent').on('shown.bs.modal', function(){
        $('input#inputDescription').val('');
        $('input#inputQuantity').val('');
        $('input#inputMarkup').val('');
        $('input#inputType').val('');

        $('.finder').each(function() {
            var url = $(this).attr('data-url');
            var finder = new ContentFinder('#'+$(this).attr('id'), url, true);
            finder.listdir(url);
        });
    });
});