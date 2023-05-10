import React from 'react';
import './ScriptElement.css';
import './Styles.css';

class ScriptElement extends React.Component {

    render() {
        return (
            <div
                className={this.props.selected ? 'script-element-selected' : 'script-element-unselected'}
                onClick={this.props.select.bind(this, this.props.index)}
            >
                <p className="small-header script-element-inset">{this.props.name}</p>
            </div>
        );
    }

}

export default ScriptElement;
