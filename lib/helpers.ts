import { Stack } from 'aws-cdk-lib';

export class CloudFormationInterface {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }

  applyToTemplate(stack: Stack) {
    stack.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };
  }
}
