import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Program } from 'src/app/models/basic_models.model';
import { ApiService } from 'src/app/services/api.service';
import { SessionService } from 'src/app/services/session.service';
import { ProgramFormPage } from './program-form.page';

describe('ProgramFormPage', () => {
  let component: ProgramFormPage;
  let api: jasmine.SpyObj<ApiService>;
  const firstProgram = Object.assign(new Program(), {
    id: 8, name: 'Programa uno', shortname: 'Uno', responsable: 'Responsable',
    information: 'Información', country_id: 2, tag_id: 3
  });
  const secondProgram = Object.assign(new Program(), {
    id: 9, name: 'Programa dos', information: 'Otra información', country_id: 1, tag_id: null
  });

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiService', ['loadPrograms']);
    api.loadPrograms.and.returnValue(of([firstProgram, secondProgram]));
    component = new ProgramFormPage(new FormBuilder(), api, { country: 'Colombia' } as SessionService);
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('initializes a new proposal with the current country and requires a name', () => {
    expect(component.form.get('operation').value).toBe('create');
    expect(component.form.get('program.country_id').value).toBe(2);
    expect(component.form.valid).toBe(false);
    component.form.get('program.name').setValue('Nuevo');
    expect(component.form.valid).toBe(true);
  });

  it('loads programs, prefills the selection and clears values when it changes', () => {
    component.form.get('operation').setValue('update');
    expect(api.loadPrograms).toHaveBeenCalledTimes(1);
    expect(component.form.invalid).toBe(true);

    component.form.get('program_id').setValue(8);
    expect(component.form.get('program.information').value).toBe('Información');
    expect(component.form.get('program.tag_id').value).toBe(3);
    component.form.get('program.information').setValue('Edited');
    component.form.get('program_id').setValue(9);
    expect(component.form.get('program.information').value).toBe('Otra información');
    expect(component.form.get('program.shortname').value).toBe('');
    expect(component.form.get('program.tag_id').value).toBeNull();

    component.form.get('operation').setValue('create');
    expect(component.form.get('program_id').value).toBeNull();
    expect(component.form.get('program.name').value).toBe('');
    expect(component.form.get('program.country_id').value).toBe(2);
  });

  it('reports loading errors and permits retrying', () => {
    spyOn(console, 'error');
    api.loadPrograms.and.returnValue(throwError('network error'));
    component.form.get('operation').setValue('update');
    expect(component.programsError).toBe(true);
    expect(component.loadingPrograms).toBe(false);
    expect(component.form.invalid).toBe(true);

    api.loadPrograms.and.returnValue(of([firstProgram]));
    component.loadPrograms();
    expect(component.programsError).toBe(false);
    expect(component.programs.length).toBe(1);
  });

  it('logs a new program without an id and does not log invalid proposals', () => {
    const log = spyOn(console, 'log');
    component.submit();
    expect(log).not.toHaveBeenCalled();
    component.form.get('program.name').setValue('Nuevo');
    component.form.get('program.tag_id').setValue('4');
    component.submit();
    const proposal = log.calls.mostRecent().args[1];
    expect(proposal.operation).toBe('create');
    expect(proposal.program.name).toBe('Nuevo');
    expect(proposal.program.country_id).toBe(2);
    expect(proposal.program.tag_id).toBe(4);
    expect(proposal.program.responsable).toBeNull();
    expect(proposal.program.id).toBeUndefined();
  });

  it('logs an update with its selected id and edited fields', () => {
    const log = spyOn(console, 'log');
    component.form.get('operation').setValue('update');
    component.form.get('program_id').setValue(8);
    component.form.get('program.information').setValue('Información editada');
    component.submit();
    const proposal = log.calls.mostRecent().args[1];
    expect(proposal.operation).toBe('update');
    expect(proposal.program.id).toBe(8);
    expect(proposal.program.information).toBe('Información editada');
    expect(proposal.program.country_id).toBe(2);
    expect(proposal.program.tag_id).toBe(3);
  });

  it('rejects invalid country and category identifiers', () => {
    component.form.get('program.name').setValue('Nuevo');
    component.form.get('program.country_id').setValue(0);
    expect(component.form.invalid).toBe(true);
    component.form.get('program.country_id').setValue(3);
    expect(component.form.invalid).toBe(true);
    component.form.get('program.country_id').setValue(1);
    component.form.get('program.tag_id').setValue(1.5);
    expect(component.form.invalid).toBe(true);
  });
});
