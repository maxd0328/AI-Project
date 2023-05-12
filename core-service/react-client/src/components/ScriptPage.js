import React from 'react';
import ScriptEditor from './ScriptEditor';
import ScriptElement from './ScriptElement';
import './ScriptPage.css';
import '../Styles.css';
import '../controllers/ScriptController';
import * as Controller from '../controllers/ScriptController';

class ScriptPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = { scripts: [], selectedIndex: -1, provisionalName: '', content: '', search: '', error: false, edited: false };

        this.reload = this.reload.bind(this);
        this.selectScript = this.selectScript.bind(this);
        this.updateSearch = this.updateSearch.bind(this);
        this.updateScript = this.updateScript.bind(this);
        this.updateProvisionalName = this.updateProvisionalName.bind(this);
        this.submitName = this.submitName.bind(this);
        this.createScript = this.createScript.bind(this);
        this.saveScript = this.saveScript.bind(this);
        this.deleteScript = this.deleteScript.bind(this);

        this.reload();
    }

    reload() {
        Controller.fetchScripts().then((scripts) => {
            let selectedIndex = this.state.selectedIndex;
            if(selectedIndex >= scripts.length)
                selectedIndex = -1;

            if(selectedIndex >= 0) {
                let script = scripts[selectedIndex];
                Controller.fetchScriptContent(script.scriptID).then(
                    (content) => this.setState({ scripts, selectedIndex, provisionalName: script.name, content, error: false, edited: false }),
                    (err) => this.setState({ scripts, selectedIndex, error: true }));
            }
            else this.setState({ scripts, error: false, selectedIndex });
        }, (err) => this.setState( { scripts: [], error: true }));
    }

    selectScript(index) {
        if(this.state.error) {
            this.setState({ selectedIndex: index }, () => this.reload());
            return;
        }

        if(index < 0) {
            this.setState({ selectedIndex: index, provisionalName: '', content: '' });
            return;
        }

        let script = this.state.scripts[index];
        Controller.fetchScriptContent(script.scriptID).then((content) => {
            this.setState({
                selectedIndex: index,
                provisionalName: script.name,
                edited: false,
                content
            });
        }, (err) => this.setState({ error: true }));
    }

    updateSearch(event) {
        this.setState({ search: event.target.value });
    }

    updateScript(content) {
        this.setState({ content, edited: true });
    }

    updateProvisionalName(event) {
        this.setState({ provisionalName: event.target.value });
    }

    submitName(event) {
        if(this.state.error) return;
        if(!event.key || event.key === 'Enter') {
            let scripts = [...this.state.scripts];
            let script = scripts[this.state.selectedIndex];
            script.name = this.state.provisionalName;

            Controller.sendScriptName(script.scriptID, this.state.provisionalName).then((result) => this.setState({ scripts }),
                (err) => this.setState({ error: true }));
        }
    }

    createScript() {
        if(this.state.error) return;
        const name = 'New script';
        Controller.sendNewScript(name, '\n# Write your script here\n').then((scriptID) => {
            let scripts = [...this.state.scripts];
            scripts.push({ scriptID, name });
            this.setState({ scripts }, () => this.selectScript(scripts.length - 1));
        }, (err) => this.setState({ error: true }));
    }

    saveScript() {
        if(this.state.error) return;
        let scripts = [...this.state.scripts];
        let script = scripts[this.state.selectedIndex];

        Controller.sendScriptContent(script.scriptID, this.state.content).then((result) => this.setState({ edited: false }),
            (err) => this.setState({ error: true }));
    }

    deleteScript() {
        if(this.state.error) return;
        Controller.sendDeleteScript(this.state.scripts[this.state.selectedIndex].scriptID).then((result) => {
            let scripts = [...this.state.scripts];
            scripts.splice(this.state.selectedIndex, 1);
            this.setState({ scripts }, () => {
                let index = this.state.selectedIndex >= this.state.scripts.length ? this.state.scripts.length - 1 : this.state.selectedIndex;
                this.selectScript(index);
            });
        }, (err) => this.setState({ error: true }));
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
                    <button className="button green" onClick={this.createScript}>Create New</button>
                </div>
                {!this.state.error ? this.state.selectedIndex >= 0 ? this.renderEditor() : this.renderEmpty() : this.renderError()}
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
                    <button className="button green" onClick={this.saveScript} disabled={!this.state.edited}>Save</button>
                    <button className="button red" onClick={this.deleteScript}>Delete</button>
                </div>
            </div>
        );
    }

    renderEmpty() {
        return (
            <div className="empty-script-container">
                <p className="small-header" style={{marginBottom: 10 + 'px'}}>Open or create a script to get started!</p>
                <button className="button green" onClick={this.createScript}>Create</button>
            </div>
        );
    }

    renderError() {
        return (
            <div className="empty-script-container">
                <p className="small-header" style={{marginBottom: 10 + 'px'}}>Something went wrong, please try again.</p>
                <button className="button blue" onClick={this.reload}>Reload</button>
            </div>
        );
    }

}

export default ScriptPage;
