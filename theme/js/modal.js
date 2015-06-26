$(document).on('shown.bs.modal', function(){
     $('input#inputName').focus();
     if ( $('#resourceListReport.in').length != 0 ) {
         $('.custom-checkbox').focus();
     }
     if ( $('#projectBudgetReport.in').length != 0 ) {
         $('input#inputLevelLimit').focus();
     }
});
