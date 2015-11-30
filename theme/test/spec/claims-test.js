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

    it('should submit a claim', function(){
        // click the claim that was added
        element(by.repeater('obj in jsonclaims').row(0)).click();
        expect(element(by.css('nav ul li a i.fa-arrow-right')).isDisplayed()).toBe(true);
        element(by.css('nav ul li a i.fa-arrow-right')).click();

        // check the claim status has changed
        element(by.repeater('obj in jsonclaims').row(0).column('obj.Status')
            ).getText().then(function(status){
                expect(status).toBe('Claimed');
        });
    });

    it('should retract a claim', function(){
        element(by.repeater('obj in jsonclaims').row(0)).click();
        element(by.css('nav ul li a i.fa-arrow-left')).click();
        // check the claim was retracted
        element(by.repeater('obj in jsonclaims').row(0).column('obj.Status')).getText().then(function(name){
            expect(name).toBe('Draft');
        });
    });

    it('should filter a claim by project', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('TestProject');
        element(by.css('.ac-select-highlight')).click()

        // check the claim is displayed
        element(by.repeater('obj in jsonclaims').row(0).column('obj.Project')).getText().then(function(project){
            expect(project).toBe('TestProject');
        });
    });

    it('should filter a claim by status', function(){
        element(by.css('li.dropdown:nth-child(3) > a:nth-child(1)')).click();
        browser.switchTo().activeElement().sendKeys('Draft');
        element(by.css('.ac-select-highlight')).click()

        // check the claim is displayed
        element(by.repeater('obj in jsonclaims').row(0).column('obj.Status')).getText().then(function(stat){
            expect(stat).toBe('Draft');
        });
    });
});
