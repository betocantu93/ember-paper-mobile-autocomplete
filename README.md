# ember-paper-mobile-autocomplete

## DEMO
albertocantug.com/ember-paper-autocomplete

This addon is a multi-purpose, radio/checkbox, mobile friendly autocomplete search and create form
that mimics the behavoir of Google Calendar mobile Android version when creating an
event, more precisely, when adding people to the event.


![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/1.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/2.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/3.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/4.png)

## Installation

* `ember install ember-paper-mobile-autocomplete`

Add styles 
`@import 'ember-paper';`
`@import 'paper-mobile-autocomplete;`

## Tips
Please refer to the comments in the code for more detailed explanation

## Usage

### Index:

-  `onClose`: Function, you must provide a callback for closing or doing something when the user wants to close or the if optionally you choose to close after select

- `modelName`: String, The model the component will be interacting 

- `selectedItems`: Array, array of items selected by the user
  - `type`: String 'radio' or 'checkbox'
    - radio: replaces selectedItem first object, every time.
      - `closeOnSelect`: Boolean that closes the modal if radio `type` is enabled 
    - checkbox: appends to selectedItems, applying uniqBy('id') to avoid duplicates

- `localItems`: Array, array of subset models `modelName` returned from peekAll that will be used in all subsequent interactions when `filterLocal` is enabled
  - `preliminaryFilterFunc`: Function, callback function (item, items) called for every record returned by peekAll, must return a boolean
 
- `filterLocal`: Boolean, the component will only filter the `localItems`
  - `filterFunc`: Function, callback function (item, items, searchTerm) called for every record on localItems, every time the user types in the search box and `filterLocal` is enabled

- `items`: Array, the actual items rendered

- `create`: Boolean, shows a bar fixed at bottom asking the user to create.
  - `createComponentName`: Name of the component to be rendered inside the creation area
  - `newItem`: Record to be created.

## Filter modes


### Filter locally (peekAll):


Instead of working directly with the live peekAll array, we work with a subset of records so we can apply complex cases like
peekAll users filtered by scope 5, so the component will always work with that subset of the store.

This is accomplished by using the callback function `preliminaryFilterFunc` (suggestions accepted for renaming) which will be called for every
record returned by peekAll with (item, items) but only in `_loadData` function which is called only at didInsertElement or when the user creates or deletes an item, ( I suppose newly created items should be in this subset, but if not, `preliminaryFilterFunc` will again make the subset)

For subsequent "queries"
You can filter the results of `localItems` by providing a callback function
`filterFunc` this function will be called with (item, items, term) params for each record in `localItems`,
so just make sure you return a bool.

For example, if you pass this function, the component will render `localItems` filtered by term.

Any component or controller
  
    filterFunc: (item, items, term) => {
      if(!isBlank(term)){
      
        term = term.trim().toUpperCase().split(/\ +/);
        
        let itemName = get(item, 'name').trim().toUpperCase().split(/\ +/);
        
        return term.every((searchWord) => {
              return itemName.some((itemWord) => {
                return itemWord.search(searchWord)>-1;
              });
            });
            
      }
    }
    

Any Template

    {{#paper-mobile-autocomplete
      filterLocal=true
      filterFunc=filterFunc
      onChange=(action (mut selectedItems))
      selectedItems=selectedItems
      preliminaryFilterFunc=preliminaryFilterFunc
      modelName='user'
    }}


### Filter remotely (query):

This is the mode enabled by default, when the user types in, a query is made using the `modelName`, you must implement the filtering in your API, the results will be cleaned to exclude any duplicates.

`onError`: Function callback when the remote query fails, it gets called with (json) so you may act accordingly

Optionals:
`remoteSearchTextProperty`: this is the key where the search term will be placed in the filter, the default is name, you can provide one of your convenience.
`remoteFilters`: they will be appended to the query, example

    remoteFilters: {
      page: 1,
      size: 50
    }
  
`include`: it will be appended to the query, `include: 'cars,people'`

Any Template

    {{#paper-mobile-autocomplete
      filterLocal=false
      onChange=(action (mut selectedItems))
      selectedItems=selectedItems
      modelName='user'
      remoteFilters=remoteFilters
      include=include
    }}
    
    
Model Creation

For showing the create bar at the bottom you need to pass `create=true`, and create a component to be rendered.
When the user clics on create, the `createComponentName` is rendered and it gets passed down a fresh new record to be filled, so when you can assume you have a record in your template in model property, use the logic you need, and when you are done, just bubble onCreate passing a boolean meaning if the user succeed or failed, and the model if it was created

Example

application.hbs

     {{#paper-mobile-autocomplete
        filterLocal=false
        onChange=(action (mut selectedItems))
        selectedItems=selectedItems
        modelName='user'
        remoteFilters=remoteFilters
        include=include
        create=true
        createComponentName='create-component'
     }}
     
create-component.hbs
      
    {{#paper-form class="layout-column layout-padding" onSubmit=(action "addUser") as |form|}}
      {{#paper-dialog-content class="layout flex"}}
        <h2 class="md-title">What are the physician attributes?</h2>
        <p>Remember to provide the email</p>

        {{form.input
    
          label="Name"
          class="flex"
          required=true
          autofocus=true
          value=model.name
          errorMessages=(hash
            required="Enter the name."
          )
          onChange=(action (mut model.name))
        }}
        {{form.input
          label="Email"
          class="flex"
          required=true
          value=model.email
          errorMessages=(hash
            required="Enter the email."
          )
          onChange=(action (mut model.email))
        }}
        {{form.input
          label="Mobile"
          class="flex"
          value=model.phone
          type="number"
          onChange=(action (mut model.phone))
        }}

      {{/paper-dialog-content}}
  
      {{#paper-dialog-actions class="layout-row"}}
        <span class="flex"></span>
        {{#unless isLoading}}
          {{#paper-button primary=true onTap=(action onCreate false)}}Cancel{{/paper-button}}
          {{#form.submit-button disabled=(or form.isInvalid isLoading) raised=true primary=true}}Create{{/form.submit-button}}
        {{else}}
          {{paper-progress-circular}}
        {{/unless}}
      {{/paper-dialog-actions}}
    {{/paper-form}}


create-component.js
    
    export default Component.extend({
      layout,
      store: service(),
    
      actions: {
        addUser(){
          let {model} = getProperties(this, 'model');
    
          /*
          * Here you should validate and persist your model before
          * sending the action.
          * */
    
          model.save().then((item) => {
              this.sendAction('onCreate', true, item);
          }).catch((json) => {
              this.sendAction('onCreate', false);
          });
   
        }
      }
    });


