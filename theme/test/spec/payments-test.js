// run test on the payments page
describe('Payments Page', function () {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/payments');
    });

    // tests its on the payments page
    it('should be on the payments page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/payments');
    });

    // add a payment
    it('should add a new payment', function () {
        // open the add payment modal and fill in the form
        var paymentModal = element(by.id('savePaymentModal'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(paymentModal.isDisplayed()).toBe(true);
        paymentModal.element(by.model('formData.ReferenceNumber')).sendKeys('TEST');

        var projectname = "TestProject";
        var projectselect = paymentModal.element(by.id('inputProject_chosen'))
        projectselect.click();
        browser.actions().sendKeys(projectname).perform();
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
            items[0].click();
        });

        var claimselect = paymentModal.element(by.id('inputClaim_chosen'))
        claimselect.click();
        claimselect.all(by.css('.chosen-results li')).then(function(items) {
            items[1].click();
        })

        paymentModal.element(by.css('#inputDate i.fa-calendar')).click();
        paymentModal.element(by.css('#inputDate ul table tbody tr td.day.active')).click()

        paymentModal.element(by.model('formData.Amount')).sendKeys(50);

        expect(paymentModal.element(by.buttonText('Save')).isEnabled()).toBe(true);
        paymentModal.element(by.buttonText('Save')).click();

        // check the claim was added
        element(by.repeater('obj in jsonpayments').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
       });
    });
});
