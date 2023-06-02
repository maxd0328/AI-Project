import React, {useCallback, useEffect, useRef, useState} from 'react';
import AceEditor from 'react-ace';
import './ScriptEditor.css';
import ace from 'ace-builds';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/ext-language_tools';
import * as Definitions from 'compiler/Definitions';
import compile from 'compiler/Compiler';

// This only defines high-level behaviour of the Mode like folding etc.
ace.define('ace/mode/custom', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/custom_highlight_rules'], (acequire, exports) => {
    const oop = acequire('ace/lib/oop');
    const TextMode = acequire('ace/mode/text').Mode;
    const CustomHighlightRules = acequire('ace/mode/custom_highlight_rules').CustomHighlightRules;

    const CstyleBehaviour = acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;

    const CustomBehaviour = function CustomBehaviour() {
        this.inherit(CstyleBehaviour);
    };

    oop.inherits(CustomBehaviour, CstyleBehaviour);

    const Mode = function() {
        this.HighlightRules = CustomHighlightRules;
        this.$behaviour = new CustomBehaviour();
    }

    oop.inherits(Mode, TextMode); // ACE's way of doing inheritance

    exports.Mode = Mode; // eslint-disable-line no-param-reassign
});

// This is where we really create the highlighting rules
ace.define('ace/mode/custom_highlight_rules', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], (acequire, exports) => {
    const oop = acequire('ace/lib/oop');
    const TextHighlightRules = acequire('ace/mode/text_highlight_rules').TextHighlightRules;

    const CustomHighlightRules = function CustomHighlightRules() {
        this.$rules = {
            start: [
                { token: 'annotation', regex: /(?:^|\s)@[A-Za-z_][A-Za-z0-9_]*\b/ },
                { token: 'field', regex: '\\b' + Definitions.getKeyRegex() + '\\b' },
                { token: 'enum', regex: '\\b' + Definitions.getEnumRegex() + '\\b' },
                { token: 'empty', regex: '\\b(empty)\\b' },
                { token: 'identifier', regex: '\\b[A-Za-z_][A-Za-z0-9_]*\\b' },
                { token: 'operator', regex: '[=\\{\\},\\(\\)]' },
                { token: 'numeric', regex: '(?<![A-Za-z0-9.])[-]?(\\d+\\.?|\\d*\\.\\d+)(?![A-Za-z0-9.])' },
                { token: 'comment', regex: '#.*$' }
            ]
        };
    };

    oop.inherits(CustomHighlightRules, TextHighlightRules);

    exports.CustomHighlightRules = CustomHighlightRules;
});

const ScriptAnnotation = ({ annotation, select }) => {
    return (
        <button className="script-annotation" onClick={select.bind(null, annotation.row - 1, annotation.col)}>
            ({annotation.row}:{annotation.col}) {annotation.type}: {annotation.message}
        </button>
    );
}

const ScriptEditor = (props) => {
    const [compiledContent, setCompiledContent] = useState('');
    const [annotations, setAnnotations] = useState([]);
    const aceEditor = useRef(null);

    /* Compile the script every 5 seconds if it has been changed */
    const compileTimeout = useRef(null);
    const compileDebounce = useCallback((content) => {
        const later = () => {
            clearTimeout(compileTimeout.current);
            const { annotations } = compile(content);
            annotations.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

            setCompiledContent(content);
            setAnnotations(annotations);
        };

        clearTimeout(compileTimeout.current);
        compileTimeout.current = setTimeout(later, 3000); // 3 seconds
    }, []);

    useEffect(() => {
        if(props.children !== compiledContent)
            compileDebounce(props.children);
    }, [props.children, compiledContent, compileDebounce]);

    /* Set up autocompletion on initialization */
    useEffect(() => {
        const editor = aceEditor.current.editor;
        editor.setOptions({
            enableBasicAutocompletion: true
        });
    }, []);

    /* Add annotations to live editor upon change */
    useEffect(() => {
        if(aceEditor.current) {
            const session = aceEditor.current.editor.getSession();
            session.setAnnotations(annotations.map(e => ({
                row: e.row - 1,
                column: e.col,
                text: e.message,
                type: e.type
            })));
        }
    }, [annotations]);

    /* Update parent component with changed content */
    const handleChange = (event) => {
        if(props.callback) props.callback(event);
    };

    /* Set cursor position in editor (called by annotation console when clicking on a warning) */
    const selectInEditor = (row, column) => {
        if(aceEditor.current) {
            aceEditor.current.editor.selection.moveToPosition({ row, column });
            aceEditor.current.editor.focus();
        }
    }

    /* Render editor */
    const annotationQty = annotations.length,
        notificationQty = annotations.filter(e => e.type === 'info').length,
        warningQty = annotations.filter(e => e.type === 'warning').length;

    return (
        <div style={{width: 100 + '%', height: 100 + '%', display: 'flex', flexDirection: 'row'}}>
            <AceEditor
                mode="custom"
                theme="dracula"
                className="ace-matej"
                fontSize={14}
                width={props.callback ? '70%' : '100%'}
                height="100%"
                editorProps={{ $blockScrolling: true, wrapEnabled: true }}
                value={props.children}
                onChange={handleChange}
                readOnly={!props.callback}
                ref={aceEditor}
            />
            { props.callback ? <div className="script-console">
                <h1>{annotationQty} Compiler Message{annotationQty !== 1 ? 's' : ''}</h1>
                <h2 style={notificationQty > 0 ? {color: '#80b8ff'} : {}}>{notificationQty} Notification{notificationQty !== 1 ? 's' : ''}</h2>
                <h2 style={warningQty > 0 ? {color: '#ffff33'} : {}}>{warningQty} Warning{warningQty !== 1 ? 's' : ''}</h2>
                <div className="script-annotation-container">
                    { annotations.map((annotation, index) => <ScriptAnnotation key={index} annotation={annotation} select={selectInEditor} />) }
                </div>
            </div> : null }
        </div>
    );
};

export default ScriptEditor;
