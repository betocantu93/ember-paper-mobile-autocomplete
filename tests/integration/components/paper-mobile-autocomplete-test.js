import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('paper-mobile-autocomplete', 'Integration | Component | paper mobile autocomplete', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{paper-mobile-autocomplete}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#paper-mobile-autocomplete}}
      template block text
    {{/paper-mobile-autocomplete}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
