import React from 'react';
import ScriptEditor from './ScriptEditor';
import ScriptElement from './ScriptElement';
import './ScriptPage.css';
import './Styles.css';

class ScriptPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = { scripts: [], selectedIndex: -1, provisionalName: '', content: '', search: '' };

        this.selectScript = this.selectScript.bind(this);
        this.updateSearch = this.updateSearch.bind(this);
        this.updateScript = this.updateScript.bind(this);
        this.updateProvisionalName = this.updateProvisionalName.bind(this);
        this.submitName = this.submitName.bind(this);
        this.createScript = this.createScript.bind(this);
        this.saveScript = this.saveScript.bind(this);
        this.deleteScript = this.deleteScript.bind(this);
    }

    selectScript(index) {
        this.setState({
            selectedIndex: index,
            provisionalName: index < 0 ? '' : this.state.scripts[index].name,
            content: index < 0 ? '' : this.state.scripts[index].content
        });
    }

    updateSearch(event) {
        this.setState({ search: event.target.value });
    }

    updateScript(content) {
        this.setState({ content });
    }

    updateProvisionalName(event) {
        this.setState({ provisionalName: event.target.value });
    }

    submitName(event) {
        if(!event.key || event.key === 'Enter') {
            let scripts = [...this.state.scripts];
            scripts[this.state.selectedIndex].name = this.state.provisionalName;
            this.setState({ scripts });
        }
    }

    createScript() {
        let scripts = [...this.state.scripts];
        let index = scripts.length;
        scripts.push({ name: 'New script', content: '\n# Write your script here\n' });
        this.setState({ scripts }, () => this.selectScript(index));
    }

    saveScript() {
        let scripts = [...this.state.scripts];
        scripts[this.state.selectedIndex].content = this.state.content;
        this.setState({ scripts });
    }

    deleteScript() {
        let scripts = [...this.state.scripts];
        scripts.splice(this.state.selectedIndex, 1);
        this.setState({ scripts }, () => {
            let index = this.state.selectedIndex >= this.state.scripts.length ? this.state.scripts.length - 1 : this.state.selectedIndex;
            this.selectScript(index);
        });
    }

    render() {
        return (
            <div className="script-page">
                <div className="script-sidebar">
                    <p className="small-header">Browse Scripts</p>
                    <input type="text" placeholder="Search" className="text-field" style={{fontSize: 12 + 'px'}}
                        onChange={this.updateSearch} value={this.state.search}/>
                    <div className="sidebar-container">{
                        this.state.scripts.map((script, i) => {
                            if(script.name.toLowerCase().includes(this.state.search.trim().toLowerCase()))
                                return (<ScriptElement name={script.name} key={i} index={i} select={this.selectScript}
                                           selected={this.state.selectedIndex === i}/>);
                            else return null;
                        })
                    }</div>
                    <button className="button-green" onClick={this.createScript}>Create New</button>
                </div>
                {this.state.selectedIndex >= 0 ? this.renderEditor() : this.renderEmpty()}
            </div>
        );
    }

    renderEditor() {
        return (
            <div className="script-container">
                <input type="text" placeholder="Script name" className="text-field"
                       value={this.state.provisionalName}
                       onChange={this.updateProvisionalName}
                       onKeyDown={this.submitName}
                       onBlur={this.submitName}
                />
                <div className="script-editor">
                    <ScriptEditor callback={this.updateScript}>
                        {this.state.content}
                    </ScriptEditor>
                </div>
                <div className="script-button-container">
                    <button className="button-green" onClick={this.saveScript}>Save</button>
                    <button className="button-red" onClick={this.deleteScript}>Delete</button>
                </div>
            </div>
        );
    }

    renderEmpty() {
        return (
            <div className="empty-script-container">
                <p className="small-header" style={{marginBottom: 10 + 'px'}}>Create a script to get started!</p>
                <button className="button-green" onClick={this.createScript}>Create</button>
            </div>
        );
    }

}

export default ScriptPage;
