# ember-paper-mobile-autocomplete

## DEMO
[Ember-paper-mobile-autocomplete DEMO](http://albertocantug.com/ember-paper-mobile-autocomplete/)

This addon is a multi-purpose, radio/checkbox, mobile friendly autocomplete search and create form
that mimics the behavoir of Google Calendar mobile Android version when creating an
event, more precisely, when adding people to the event.

**It relies heavily on Ember data superpowers and conventions, because it's primary property is a model type**


![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/1.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/2.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/3.png)
![Showcase](http://albertocantug.com/ember-paper-mobile-autocomplete/4.png)

## Installation

* `ember install ember-paper-mobile-autocomplete`

Add styles
* `@import 'ember-paper';`

* `@import 'paper-mobile-autocomplete;`

## Tips
Please refer to the comments in the code for more detailed explanation

## Usage

### Index:

- `itemHeight`: Integer, in order for the virtual scrolling to work smoothly, you must provide an itemHeight
otherwise the view will flicker, this is a known downside for 60 fps scrolling, just make sure all your items have the same height,
you can get this height by inspecting the dom in any browser with dev tools.

-  `sortBy`: String (optional) you can provide a property name for the items to be sorted

-  `onClose`: Function, you must provide a callback for closing or doing something when the user wants to close

- `modelName`: String, The model the component will be interacting

- `selectedItems`: Array, array of items selected by the user
  - `type`: String 'radio' or 'checkbox'
    - radio: replaces selectedItem first object, every time.
      - `closeOnSelect`: Boolean that closes the modal if radio `type` is enabled
    - checkbox: appends to selectedItems, applying uniqBy('id') to remove duplicates

- `localItems`: Array, set of records returned from peekAll(`modelName`) filtered by `preliminaryFilterFunc`, that will be used in all subsequent interactions when `filterLocal` is true, basically the options in this particular component instance.
  - `preliminaryFilterFunc`: Function, callback to filter the set of `localItems` it's called with (item, items) for every record returned by peekAll, must return a boolean

- `filterLocal`: Boolean, set the component to filter locally, using `filterFunc` to filter `localItems`
  - `filterFunc`: Function, callback function (item, items, searchTerm) called for every record on localItems, every time the user types in the search box and `filterLocal` is enabled

- `items`: Array, the actual items rendered

- `create`: Boolean, shows a bar fixed at bottom asking the user to create.
  - `createComponentName`: Name of the component to be rendered inside the creation area
  - `newItem`: Record to be created.


## Rendering

The component yields |section item component|

In section you will get feedback of where exactly this item is being rendered, for any custom rendering logic.

Available sections:

  * selected-radio
  
  * radio-list
  
  * checkbox-list

In the `item` you will get the actual ember data record so you can display it as you like, it's surrounded by a `{{#paper-item}}` though and strongly suggest you assure the same height for all the items and set this height to `itemHeight` to avoid flickering

Component is just the mere component, maybe it's not a good idea, but for now I'll leave it there.

Rendering example:


    {{#paper-mobile-autocomplete
      modelName='user'
      onClose=(action "onClose")
      onChange=(action (mut selectedItems))
      selectedItems=selectedItems
      itemHeight=73
      doneLabel="DONE"
      type="radio"
      filterFunc=filterFunc
      create=true
      filterLocal=true
      preliminaryFilterFunc=preliminaryFilterFunc
      as |section item component|
    }}

      <div class="md-list-item-text">
        <span class="word-wrap">

          {{paper-autocomplete-highlight
            label=item.name
            searchText=component.searchText
            flags="i"}}

        </span>

      </div>

    {{/paper-mobile-autocomplete}}



## Filter modes


### Filter locally (peekAll):


Instead of working directly with the a peekAll array, we work with a set of records using `preliminaryFilterFunc` so we can apply complex cases like
peekAll users filtered by scope 5, so the component will always maintain `localItems` updated using `preliminaryFilterFunc`, even when creating, selecting or unselecting

This is accomplished by using the callback function `preliminaryFilterFunc` (suggestions accepted for renaming) which will be called for every
record returned by peekAll(`modelName`) with (item, items) but only in `_loadData` function which is called only at didInsertElement or when the user creates or unselects an item, ( I suppose newly created items should be appended in this set, but if not, `preliminaryFilterFunc` will again make the set)

For "queries" typed by user
You can filter the results of `localItems` (the set) by providing a callback function
`filterFunc` this function will be called with (item, items, term) params for each record in `localItems`,
so just make sure you return a bool.

For example, if you pass this function, the component will render `localItems` filtered by the user input term.

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

This is the mode enabled by default, when the user types in, a query is made using ember data query(`modelName`), you must implement the filtering in your API, the results will exclude any duplicates.

`onError`: Function callback when the remote query fails, it gets called with (json) so you may act accordingly

Optionals:
`remoteSearchTextProperty`: this is the key where the search term will be placed in the filter for the query, the default is name, you can provide one of your convenience.
`remoteFilters`: they will be appended to the query, example

    remoteFilters: {
      page: 1,
      size: 50
    }

`include`: it will be appended to the query, `include: 'cars,people'`

Any Template

    {{#paper-mobile-autocomplete
      filterLocal=false
      itemHeight=73
      onChange=(action (mut selectedItems))
      selectedItems=selectedItems
      modelName='user'
      remoteFilters=remoteFilters
      include=include
    }}


Model Creation

For showing the create bar at the bottom you need to pass `create=true`, and create a component to be rendered.
When the user clicks on create, the `createComponentName` is rendered and it gets passed down the modelName and the action onCreate, which needs to be bubbled after saving the record with the model the user just created as a param

Example

application.hbs

     {{#paper-mobile-autocomplete
        filterLocal=false
        onChange=(action (mut selectedItems))
        itemHeight=73
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
          value=name
          errorMessages=(hash
            required="Enter the name."
          )
          onChange=(action (mut name))
        }}
        {{form.input
          label="Email"
          class="flex"
          required=true
          value=email
          errorMessages=(hash
            required="Enter the email."
          )
          onChange=(action (mut email))
        }}
        {{form.input
          label="Mobile"
          class="flex"
          value=phone
          type="number"
          onChange=(action (mut phone))
        }}
    
      {{/paper-dialog-content}}
    
      {{#paper-dialog-actions class="layout-row"}}
        <span class="flex"></span>
        {{#unless isLoading}}
          {{#paper-button primary=true onClick=(action onCreate false)}}Cancel{{/paper-button}}
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
            let { store, name, email, phone, modelName } = getProperties(this, 'store', 'name', 'email', 'phone', 'modelName');
      
            /*
            * Here you should validate and persist your model before
            * sending the action.
            * */
            
            // model.save().then((item) => {
            //   this.sendAction('onCreate', item);
            // });
      
            let item = store.createRecord(modelName, {
              name: name,
              email: email,
              phone: phone
            })
            
            this.sendAction('onCreate', item);
          }
      }
    });
