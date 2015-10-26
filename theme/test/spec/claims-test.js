describe('Claims page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/claims');
    });

    // tests its on the claims page
    it('should be on the claims page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/claims');
    });

    // add a claim
    it('should add a claim', function(){
        // open the add claim modal and fill in the form
        var addClaimModal = element(by.id('saveClaimModal'));
        var projectname = "TestProject";
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addClaimModal.isDisplayed()).toBe(true);
        var projectselect = addClaimModal.element(by.id('inputProject_chosen'))
        projectselect.click();
        browser.actions().sendKeys(projectname).perform();
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
            items[0].click();
        });

        var valselect = addClaimModal.element(by.id('inputValuation_chosen'))
        valselect.click();
        valselect.all(by.css('.chosen-results li')).then(function(items) {
            items[1].click();
        })

        addClaimModal.element(by.css('#inputDate i.fa-calendar')).click();
        addClaimModal.element(by.css('#inputDate ul table tbody tr td.day.active')).click()
        addClaimModal.element(by.buttonText('Save')).click();

        // check the claim was added
       element(by.repeater('obj in jsonclaims').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
       });
    });
});
